// Cliente HTTP "educado": se identifica como YouthMatchBot, respeta robots.txt
// y nunca hace más de 1 petición por segundo al mismo dominio.
import { MIN_DELAY_MS, USER_AGENT } from "./config";
import { parseRobots, type Robots } from "./robots";

export class RobotsDisallowed extends Error {
  constructor(url: string, reason = "robots.txt lo prohíbe") {
    super(`${reason}: ${url}`);
    this.name = "RobotsDisallowed";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type GetOpts = { headers?: Record<string, string>; timeoutMs?: number; skipRobots?: boolean; retries?: number };

export class Http {
  private nextSlot = new Map<string, number>();
  private robots = new Map<string, Promise<Robots>>();
  /** Número de peticiones hechas (para el resumen de la ejecución). */
  requests = 0;

  constructor(private fetchImpl: typeof fetch = fetch) {}

  /** Espera el turno del dominio: como mínimo MIN_DELAY_MS entre peticiones. */
  async throttle(host: string) {
    const now = Date.now();
    const at = Math.max(now, this.nextSlot.get(host) ?? 0);
    this.nextSlot.set(host, at + MIN_DELAY_MS);
    if (at > now) await sleep(at - now);
  }

  private robotsFor(origin: string): Promise<Robots> {
    let p = this.robots.get(origin);
    if (!p) {
      p = (async () => {
        try {
          const res = await this.raw(`${origin}/robots.txt`, { timeoutMs: 15000, retries: 0 });
          const type = res.headers.get("content-type") ?? "";
          // Sin robots.txt (404) o si devuelve una página HTML: no hay reglas.
          if (!res.ok || type.includes("html")) return parseRobots("");
          return parseRobots(await res.text());
        } catch {
          return parseRobots("");
        }
      })();
      this.robots.set(origin, p);
    }
    return p;
  }

  /** ¿robots.txt permite visitar esta URL? */
  async allowed(url: string): Promise<boolean> {
    const u = new URL(url);
    const robots = await this.robotsFor(u.origin);
    return !robots.forbidsAi && robots.allows(u.pathname + u.search);
  }

  private async raw(url: string, opts: GetOpts = {}): Promise<Response> {
    const host = new URL(url).hostname;
    const retries = opts.retries ?? 2;
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      await this.throttle(host);
      this.requests++;
      try {
        const res = await this.fetchImpl(url, {
          headers: { "User-Agent": USER_AGENT, "Accept-Language": "es,en;q=0.8", ...opts.headers },
          redirect: "follow",
          signal: AbortSignal.timeout(opts.timeoutMs ?? 30000),
        });
        if ((res.status === 429 || res.status >= 500) && attempt < retries) {
          const wait = Number(res.headers.get("retry-after")) * 1000 || 3000 * 2 ** attempt;
          await sleep(Math.min(wait, 60000));
          continue;
        }
        return res;
      } catch (e) {
        lastError = e;
        if (attempt < retries) await sleep(2000 * 2 ** attempt);
      }
    }
    throw new Error(`No se pudo descargar ${url}: ${lastError instanceof Error ? lastError.message : lastError}`);
  }

  private async get(url: string, opts: GetOpts = {}): Promise<Response> {
    if (!opts.skipRobots && !(await this.allowed(url))) throw new RobotsDisallowed(url);
    const res = await this.raw(url, opts);
    if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
    return res;
  }

  async text(url: string, opts?: GetOpts): Promise<string> {
    return (await this.get(url, opts)).text();
  }

  async json<T = unknown>(url: string, opts?: GetOpts): Promise<T> {
    return (await this.get(url, { ...opts, headers: { Accept: "application/json", ...opts?.headers } })).json() as Promise<T>;
  }

  async bytes(url: string, opts?: GetOpts): Promise<{ data: Uint8Array; type: string }> {
    const res = await this.get(url, opts);
    return { data: new Uint8Array(await res.arrayBuffer()), type: res.headers.get("content-type") ?? "" };
  }

  /**
   * Comprueba que un enlace responde. true = responde, false = roto,
   * null = no se pudo comprobar (bloquea bots, robots.txt, tiempo agotado).
   */
  async linkOk(url: string): Promise<boolean | null> {
    try {
      if (!(await this.allowed(url))) return null;
      const res = await this.raw(url, { timeoutMs: 20000, retries: 0 });
      await res.body?.cancel().catch(() => {});
      if (res.ok) return true;
      if (res.status === 404 || res.status === 410) return false;
      return null;
    } catch {
      return null;
    }
  }
}
