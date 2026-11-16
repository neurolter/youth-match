// Tipos de la base de datos (basados en `supabase gen types`).
// Si cambias el esquema, vuelve a generarlos.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Rel = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<Row, Required extends keyof Row, Relationships extends Rel[] = []> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: Relationships;
};

export type ProfileRow = {
  avatar_url: string | null;
  birth_year: number | null;
  country: string | null;
  created_at: string;
  education_level: string | null;
  full_name: string | null;
  id: string;
  interests: string[];
  languages: string[];
  nationality: string | null;
  onboarded: boolean;
  only_funded: boolean;
  opportunity_types: string[];
  regions: string[];
  role: string;
  updated_at: string;
};

export type SourceRow = {
  auto_publish: boolean;
  categories: string[];
  created_at: string;
  frequency_hours: number;
  id: string;
  kind: string;
  language: string;
  last_run_at: string | null;
  name: string;
  notes: string | null;
  priority: number;
  region_focus: string | null;
  slug: string;
  status: string;
  tier: number;
  updated_at: string;
  url: string;
};

export type OpportunityRow = {
  application_url: string | null;
  areas: string[];
  benefits: string[];
  canonical_url: string | null;
  cost_note: string | null;
  created_at: string;
  deadline: string | null;
  description: string | null;
  destination_countries: string[];
  education_levels: string[];
  eligible_nationalities: string[];
  end_date: string | null;
  external_id: string | null;
  fingerprint: string | null;
  funding: string;
  id: string;
  image_url: string | null;
  is_premium: boolean;
  languages: string[];
  last_seen_at: string | null;
  max_age: number | null;
  min_age: number | null;
  modality: string;
  organization: string;
  organizer_id: string | null;
  published_at: string | null;
  region: string | null;
  requirements: string[];
  review_notes: string | null;
  rolling_deadline: boolean;
  search: unknown;
  slug: string;
  source_id: string | null;
  start_date: string | null;
  status: string;
  summary: string | null;
  title: string;
  trust_score: number;
  type: string;
  updated_at: string;
};

export type SavedRow = { created_at: string; opportunity_id: string; user_id: string };

export type ApplicationRow = {
  created_at: string;
  id: string;
  notes: string | null;
  opportunity_id: string;
  status: string;
  updated_at: string;
  user_id: string;
};

export type ImportRunRow = {
  created: number;
  errors: Json;
  expired: number;
  finished_at: string | null;
  found: number;
  id: string;
  source_id: string;
  started_at: string;
  status: string;
  updated: number;
};

export type PlanRow = {
  active: boolean;
  billing_interval: string | null;
  currency: string;
  description: string | null;
  features: string[];
  id: string;
  name: string;
  price_cents: number;
  sort_order: number;
};

export type SubscriptionRow = {
  cancel_at_period_end: boolean;
  created_at: string;
  current_period_end: string | null;
  id: string;
  plan_id: string;
  provider: string | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  status: string;
  updated_at: string;
  user_id: string;
};

export type PaymentEventRow = {
  created_at: string;
  event_id: string;
  id: string;
  payload: Json;
  processed_at: string | null;
  provider: string;
  type: string;
};

export type NotificationRow = {
  body: string | null;
  created_at: string;
  id: string;
  kind: string;
  opportunity_id: string | null;
  read_at: string | null;
  send_at: string;
  sent_at: string | null;
  title: string;
  user_id: string;
};


export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" };
  public: {
    Tables: {
      profiles: Table<ProfileRow, "id">;
      sources: Table<SourceRow, "name" | "slug" | "url">;
      opportunities: Table<
        OpportunityRow,
        "organization" | "slug" | "title" | "type",
        [
          { foreignKeyName: "opportunities_organizer_id_fkey"; columns: ["organizer_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "opportunities_source_id_fkey"; columns: ["source_id"]; isOneToOne: false; referencedRelation: "sources"; referencedColumns: ["id"] },
        ]
      >;
      saved_opportunities: Table<
        SavedRow,
        "opportunity_id" | "user_id",
        [
          { foreignKeyName: "saved_opportunities_opportunity_id_fkey"; columns: ["opportunity_id"]; isOneToOne: false; referencedRelation: "opportunities"; referencedColumns: ["id"] },
          { foreignKeyName: "saved_opportunities_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      >;
      applications: Table<
        ApplicationRow,
        "opportunity_id" | "user_id",
        [
          { foreignKeyName: "applications_opportunity_id_fkey"; columns: ["opportunity_id"]; isOneToOne: false; referencedRelation: "opportunities"; referencedColumns: ["id"] },
          { foreignKeyName: "applications_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      >;
      import_runs: Table<
        ImportRunRow,
        "source_id",
        [{ foreignKeyName: "import_runs_source_id_fkey"; columns: ["source_id"]; isOneToOne: false; referencedRelation: "sources"; referencedColumns: ["id"] }]
      >;
      plans: Table<PlanRow, "id" | "name">;
      subscriptions: Table<
        SubscriptionRow,
        "plan_id" | "user_id",
        [
          { foreignKeyName: "subscriptions_plan_id_fkey"; columns: ["plan_id"]; isOneToOne: false; referencedRelation: "plans"; referencedColumns: ["id"] },
          { foreignKeyName: "subscriptions_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      >;
      payment_events: Table<PaymentEventRow, "event_id" | "payload" | "provider" | "type">;
      notifications: Table<
        NotificationRow,
        "kind" | "title" | "user_id",
        [
          { foreignKeyName: "notifications_opportunity_id_fkey"; columns: ["opportunity_id"]; isOneToOne: false; referencedRelation: "opportunities"; referencedColumns: ["id"] },
          { foreignKeyName: "notifications_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      expire_past_deadlines: { Args: never; Returns: number };
      is_admin: { Args: never; Returns: boolean };
      user_has_premium: { Args: never; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Opportunity = OpportunityRow;
export type Profile = ProfileRow;
