// Lector de robots.txt: decide si YouthMatchBot puede visitar una URL.

type Rule = { allow: boolean; pattern: string };
type Group = { agents: string[]; rules: Rule[]; signals: Record<string, string> };

export type Robots = {
  /** ¿Puede el bot visitar esta ruta (path + query)? */
  allows(path: string): boolean;
  /** ¿El sitio prohíbe usar su contenido como entrada de una IA? (Content-Signal: ai-input=no) */
  forbidsAi: boolean;
};

const BOT = "youthmatchbot";

export function parseRobots(txt: string): Robots {
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;

  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [], signals: {} };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (key === "allow" || key === "disallow") {
      if (value) current.rules.push({ allow: key === "allow", pattern: value });
    } else if (key === "content-signal") {
      for (const part of value.split(",")) {
        const [k, v] = part.split("=").map((s) => s.trim().toLowerCase());
        if (k && v) current.signals[k] = v;
      }
    }
  }

  // El grupo más específico manda: primero el nuestro, si no, el de "*".
  const group =
    groups.find((g) => g.agents.some((a) => a !== "*" && BOT.includes(a))) ??
    groups.find((g) => g.agents.includes("*"));
  const rules = group?.rules ?? [];

  const matches = (pattern: string, path: string) => {
    const anchored = pattern.endsWith("$");
    const body = (anchored ? pattern.slice(0, -1) : pattern)
      .split("*")
      .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*");
    return new RegExp(`^${body}${anchored ? "$" : ""}`).test(path);
  };

  return {
    allows(path: string) {
      let best: Rule | null = null;
      for (const r of rules) {
        if (!matches(r.pattern, path)) continue;
        // Gana la regla más larga; en empate, Allow.
        if (!best || r.pattern.length > best.pattern.length || (r.pattern.length === best.pattern.length && r.allow)) {
          best = r;
        }
      }
      return best ? best.allow : true;
    },
    forbidsAi: group?.signals["ai-input"] === "no",
  };
}
