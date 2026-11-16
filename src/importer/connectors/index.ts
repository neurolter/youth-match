// Registro de conectores: slug de la tabla `sources` → conector.
// Para añadir una fuente: crea su conector (o reutiliza rssConnector) y regístralo aquí.
import type { Connector } from "../types";
import { carolina } from "./carolina";
import { oea } from "./oea";
import { oneYoungWorld } from "./one-young-world";
import { rssConnector } from "./rss";
import { santander } from "./santander";
import { senescyt } from "./senescyt";
import { unv } from "./unv";
import { youthopConferences } from "./youthop";

export const CONNECTORS: Record<string, Connector> = {
  // Prioridad 1
  "becas-santander": santander,
  "fundacion-carolina": carolina,
  "senescyt-globo-comun": senescyt,
  unv,
  "oea-becas": oea,
  "one-young-world": oneYoungWorld,
  "opportunity-desk": rssConnector(),
  "opportunities-corners": rssConnector(),
  // Solo la categoría "Conferences" (pedida por Sebastian)
  "opportunities-corners-conferencias": rssConnector(),
  "scholarships-corner": rssConnector(),
  "youthop-conferencias": youthopConferences,
  // Prioridad 2 (agregadores con RSS)
  "opportunities-for-youth": rssConnector(),
  oyaop: rssConnector(),
  indesgua: rssConnector(),
};
