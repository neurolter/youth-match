// Tipos compartidos del importador.
import type { Extraction } from "./schema";
import type { Http } from "./http";

/** Fila de la tabla `sources` (solo lo que usa el importador). */
export type Source = {
  id: string;
  slug: string;
  name: string;
  url: string;
  kind: string;
  tier: number;
  language: string;
  frequency_hours: number;
  auto_publish: boolean;
  status: string;
  last_run_at: string | null;
};

export type Link = { text: string; url: string };

/** Un elemento del listado de la fuente: apunta a UNA oportunidad. */
export type ListItem = {
  /** URL de la página de detalle de esa oportunidad en la fuente. */
  url: string;
  /** Identificador estable en la fuente (slug, id). Por defecto, la URL. */
  externalId?: string;
  title?: string;
  /** HTML que ya vino en el listado (p. ej. `content:encoded` de un RSS). */
  inlineHtml?: string;
  /** Datos extra del listado que el conector quiera pasar a `detail`. */
  hint?: Record<string, unknown>;
};

/** Datos estructurados y fiables que da la propia fuente (API, JSON). Mandan sobre la IA. */
export type Facts = Partial<
  Pick<
    Extraction,
    | "title"
    | "organization"
    | "type"
    | "destination_countries"
    | "region"
    | "modality"
    | "funding"
    | "eligible_nationalities"
    | "deadline"
    | "rolling_deadline"
    | "start_date"
    | "end_date"
    | "application_url"
  >
>;

/** Página de detalle ya descargada y limpia, lista para la IA. */
export type Page = {
  url: string;
  externalId: string;
  /** Texto de la convocatoria (sin menús ni anuncios). */
  text: string;
  /** Enlaces del contenido: la IA solo puede elegir el link de postulación entre estos. */
  links: Link[];
  facts?: Facts;
  /** true si la propia fuente indica que la convocatoria ya cerró. */
  closed?: boolean;
  /** Zona horaria de la fuente, para interpretar fechas (p. ej. "Europe/Madrid"). */
  timezone?: string;
  /** Texto de la fuente oficial, cuando la página es de un agregador. */
  officialText?: string;
  officialUrl?: string;
};

export type BrowserPage = {
  goto(url: string, opts?: Record<string, unknown>): Promise<unknown>;
  content(): Promise<string>;
  evaluate<T>(fn: string | ((arg: never) => T), arg?: unknown): Promise<T>;
  waitForTimeout(ms: number): Promise<void>;
  waitForResponse(pred: (r: BrowserResponse) => boolean, opts?: Record<string, unknown>): Promise<BrowserResponse>;
  close(): Promise<void>;
};
export type BrowserResponse = { url(): string; json(): Promise<unknown>; request(): { postData(): string | null } };

export type Ctx = {
  source: Source;
  http: Http;
  /** Abre una pestaña del navegador headless (Playwright). Se inicia solo si hace falta. */
  newPage(): Promise<BrowserPage>;
  log(msg: string): void;
};

/**
 * Interfaz común de los conectores: listar → visitar cada detalle → extraer.
 * Para añadir una fuente nueva basta con implementar estas dos funciones
 * (o reutilizar `rssConnector` / `htmlListConnector`) y registrarla en
 * `connectors/index.ts` con el `slug` de la tabla `sources`.
 */
export interface Connector {
  /** Devuelve las oportunidades que la fuente publica ahora (una por elemento). */
  list(ctx: Ctx): Promise<ListItem[]>;
  /** Descarga el detalle de una oportunidad. `null` = no es una oportunidad. */
  detail(item: ListItem, ctx: Ctx): Promise<Page | null>;
  /**
   * true (por defecto) si `list` devuelve TODAS las convocatorias vigentes de
   * la fuente; entonces lo que deje de aparecer 3 veces se marca como expirado.
   * Pon false en fuentes tipo "últimas publicaciones" (RSS), donde desaparecer
   * del listado no significa que la convocatoria haya cerrado.
   */
  complete?: boolean;
  /** Tope de páginas de detalle por ejecución (por defecto, MAX_PAGES_PER_RUN). */
  maxPages?: number;
}
