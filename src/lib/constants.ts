// Etiquetas en español para todos los valores de la base de datos.

export const OPPORTUNITY_TYPES = {
  beca: { label: "Beca", emoji: "🎓" },
  intercambio: { label: "Intercambio", emoji: "🌍" },
  congreso: { label: "Congreso / Cumbre", emoji: "🎤" },
  voluntariado: { label: "Voluntariado", emoji: "🤝" },
  pasantia: { label: "Pasantía", emoji: "💼" },
  competencia: { label: "Competencia / Premio", emoji: "🏆" },
  liderazgo: { label: "Programa de liderazgo", emoji: "🚀" },
  curso: { label: "Curso / Escuela de verano", emoji: "📚" },
  fellowship: { label: "Fellowship", emoji: "✨" },
  campamento: { label: "Campamento juvenil", emoji: "⛺" },
  otro: { label: "Otro", emoji: "📌" },
} as const;
export type OpportunityType = keyof typeof OPPORTUNITY_TYPES;

export const REGIONS = {
  global: "Todo el mundo",
  latinoamerica: "Latinoamérica",
  norteamerica: "Norteamérica",
  europa: "Europa",
  asia: "Asia",
  africa: "África",
  oceania: "Oceanía",
  medio_oriente: "Medio Oriente",
  online: "En línea",
} as const;
export type Region = keyof typeof REGIONS;

export const MODALITIES = {
  presencial: "Presencial",
  virtual: "Virtual",
  hibrida: "Híbrida",
} as const;

export const FUNDING = {
  total: "Financiada al 100 %",
  parcial: "Financiamiento parcial",
  sin_financiamiento: "Sin financiamiento",
  desconocido: "Financiamiento por confirmar",
} as const;
export type Funding = keyof typeof FUNDING;

export const EDUCATION_LEVELS = {
  secundaria: "Colegio / secundaria",
  pregrado: "Universidad (en curso)",
  graduado: "Universidad (graduado)",
  posgrado: "Maestría / doctorado",
  profesional: "Profesional",
} as const;
export type EducationLevel = keyof typeof EDUCATION_LEVELS;

export const APPLICATION_STATUS = {
  por_postular: { label: "Por postular", color: "bg-slate-100 text-slate-700" },
  en_proceso: { label: "Preparando", color: "bg-amber-100 text-amber-800" },
  enviada: { label: "Enviada", color: "bg-indigo-100 text-indigo-800" },
  aceptada: { label: "¡Aceptada!", color: "bg-emerald-100 text-emerald-800" },
  rechazada: { label: "No seleccionada", color: "bg-rose-100 text-rose-700" },
} as const;
export type ApplicationStatus = keyof typeof APPLICATION_STATUS;

export const INTERESTS = [
  "Liderazgo",
  "Medio ambiente y clima",
  "Tecnología e innovación",
  "Emprendimiento",
  "Derechos humanos",
  "Diplomacia y relaciones internacionales",
  "Educación",
  "Salud",
  "Arte y cultura",
  "Ciencia e investigación",
  "Negocios y economía",
  "Comunicación y periodismo",
  "Desarrollo social",
  "Deportes",
] as const;

export const LANGUAGES = {
  es: "Español",
  en: "Inglés",
  pt: "Portugués",
  fr: "Francés",
  de: "Alemán",
  it: "Italiano",
  zh: "Chino",
  ja: "Japonés",
  ru: "Ruso",
} as const;

export const COUNTRIES: Record<string, string> = {
  EC: "Ecuador", AR: "Argentina", BO: "Bolivia", BR: "Brasil", CL: "Chile",
  CO: "Colombia", CR: "Costa Rica", CU: "Cuba", DO: "República Dominicana",
  SV: "El Salvador", GT: "Guatemala", HN: "Honduras", MX: "México",
  NI: "Nicaragua", PA: "Panamá", PY: "Paraguay", PE: "Perú", PR: "Puerto Rico",
  UY: "Uruguay", VE: "Venezuela", US: "Estados Unidos", CA: "Canadá",
  ES: "España", PT: "Portugal", FR: "Francia", DE: "Alemania", IT: "Italia",
  GB: "Reino Unido", NL: "Países Bajos", BE: "Bélgica", CH: "Suiza",
  SE: "Suecia", NO: "Noruega", FI: "Finlandia", DK: "Dinamarca", IE: "Irlanda",
  AT: "Austria", PL: "Polonia", HU: "Hungría", CZ: "Chequia", RU: "Rusia",
  TR: "Turquía", CN: "China", JP: "Japón", KR: "Corea del Sur", IN: "India",
  SG: "Singapur", TW: "Taiwán", AU: "Australia", NZ: "Nueva Zelanda",
  AE: "Emiratos Árabes Unidos", QA: "Catar", SA: "Arabia Saudita",
  IL: "Israel", ZA: "Sudáfrica", KE: "Kenia", EG: "Egipto", MA: "Marruecos",
  GLOBAL: "Varios países",
};

export function countryName(code: string) {
  return COUNTRIES[code] ?? code;
}
