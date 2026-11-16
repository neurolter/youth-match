// Borrador editable de una oportunidad agregada por enlace.
export type Draft = {
  url: string;
  title: string;
  organization: string;
  type: string;
  summary: string;
  application_url: string;
  deadline: string;
  rolling_deadline: boolean;
  start_date: string;
  end_date: string;
  region: string;
  modality: string;
  funding: string;
  cost_note: string;
  destination_countries: string[];
  eligible_nationalities: string[];
  min_age: number | null;
  max_age: number | null;
  education_levels: string[];
  languages: string[];
  areas: string[];
  benefits: string[];
  requirements: string[];
  trust_score: number;
};
