-- Youth Match — esquema inicial
-- Tablas: perfiles, fuentes, oportunidades, guardadas, postulaciones,
-- ejecuciones del importador, planes, suscripciones y notificaciones.

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Perfiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  country text,                       -- país de residencia (código ISO-2)
  nationality text,                   -- nacionalidad (código ISO-2)
  birth_year int check (birth_year between 1900 and 2100),
  education_level text check (education_level in
    ('secundaria','pregrado','graduado','posgrado','profesional')),
  languages text[] not null default '{}',
  interests text[] not null default '{}',          -- áreas temáticas
  opportunity_types text[] not null default '{}',  -- tipos preferidos
  regions text[] not null default '{}',            -- regiones de destino
  only_funded boolean not null default false,
  role text not null default 'usuario' check (role in ('usuario','organizador','admin')),
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ¿El usuario actual es admin? (security definer evita recursión en RLS)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

-- Un usuario no puede cambiarse el rol a sí mismo
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role is distinct from old.role
     and coalesce(auth.role(), '') <> 'service_role'
     and not public.is_admin() then
    raise exception 'No tienes permiso para cambiar el rol';
  end if;
  return new;
end $$;

create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_profile_role();

-- Crear perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Fuentes de oportunidades (para el importador)
-- ---------------------------------------------------------------------------
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  url text not null,
  kind text not null default 'html' check (kind in ('api','rss','html','headless','manual')),
  tier int not null default 2 check (tier between 1 and 3),   -- 1 = oficial, 3 = agregador
  language text not null default 'es',
  region_focus text,
  categories text[] not null default '{}',
  frequency_hours int not null default 24,
  auto_publish boolean not null default false,
  status text not null default 'activa' check (status in ('activa','pausada','con_errores')),
  priority int not null default 2 check (priority between 1 and 3),  -- 1 = implementar primero
  notes text,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger sources_updated_at before update on public.sources
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Oportunidades
-- ---------------------------------------------------------------------------
create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  source_id uuid references public.sources(id) on delete set null,
  organizer_id uuid references public.profiles(id) on delete set null,
  external_id text,                       -- id en la fuente original
  canonical_url text,                     -- página oficial de ESTA oportunidad
  fingerprint text unique,                -- huella para deduplicar
  title text not null,
  organization text not null,
  type text not null check (type in
    ('beca','intercambio','congreso','voluntariado','pasantia','competencia',
     'liderazgo','curso','fellowship','campamento','otro')),
  summary text,
  description text,
  destination_countries text[] not null default '{}',  -- ISO-2 o 'GLOBAL'
  region text check (region in
    ('global','latinoamerica','norteamerica','europa','asia','africa','oceania','medio_oriente','online')),
  modality text not null default 'presencial' check (modality in ('presencial','virtual','hibrida')),
  funding text not null default 'desconocido' check (funding in ('total','parcial','sin_financiamiento','desconocido')),
  cost_note text,
  min_age int,
  max_age int,
  eligible_nationalities text[] not null default '{}', -- vacío = todas
  education_levels text[] not null default '{}',
  languages text[] not null default '{}',
  areas text[] not null default '{}',
  benefits text[] not null default '{}',
  requirements text[] not null default '{}',
  deadline date,
  rolling_deadline boolean not null default false,     -- convocatoria permanente
  start_date date,
  end_date date,
  application_url text,
  image_url text,
  status text not null default 'revision' check (status in
    ('borrador','revision','publicada','expirada','rechazada')),
  trust_score int not null default 50 check (trust_score between 0 and 100),
  is_premium boolean not null default false,
  review_notes text,
  last_seen_at timestamptz,               -- última vez que el importador la vio
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('spanish', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(organization,'')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(summary,'')), 'C')
  ) stored
);

create index opportunities_status_deadline_idx on public.opportunities (status, deadline);
create index opportunities_type_idx on public.opportunities (type);
create index opportunities_source_idx on public.opportunities (source_id);
create index opportunities_organizer_idx on public.opportunities (organizer_id);
create index opportunities_search_idx on public.opportunities using gin (search);
create index opportunities_title_trgm_idx on public.opportunities using gin (title extensions.gin_trgm_ops);

create trigger opportunities_updated_at before update on public.opportunities
  for each row execute function public.set_updated_at();

-- Marcar como expiradas las oportunidades con fecha límite pasada
create or replace function public.expire_past_deadlines()
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  update public.opportunities
     set status = 'expirada'
   where status = 'publicada'
     and rolling_deadline = false
     and deadline is not null
     and deadline < (now() at time zone 'America/Guayaquil')::date;
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- Guardadas y postulaciones
-- ---------------------------------------------------------------------------
create table public.saved_opportunities (
  user_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, opportunity_id)
);
create index saved_opportunity_idx on public.saved_opportunities (opportunity_id);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  status text not null default 'por_postular' check (status in
    ('por_postular','en_proceso','enviada','aceptada','rechazada')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, opportunity_id)
);
create index applications_opportunity_idx on public.applications (opportunity_id);

create trigger applications_updated_at before update on public.applications
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Registro del importador
-- ---------------------------------------------------------------------------
create table public.import_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'en_curso' check (status in ('en_curso','ok','parcial','error')),
  found int not null default 0,
  created int not null default 0,
  updated int not null default 0,
  expired int not null default 0,
  errors jsonb not null default '[]'::jsonb
);
create index import_runs_source_idx on public.import_runs (source_id, started_at desc);

-- ---------------------------------------------------------------------------
-- Planes, suscripciones (pasarela por conectar) y notificaciones
-- ---------------------------------------------------------------------------
create table public.plans (
  id text primary key,                    -- 'gratis', 'premium_mensual', 'premium_anual'
  name text not null,
  description text,
  price_cents int not null default 0,
  currency text not null default 'USD',
  billing_interval text check (billing_interval in ('mes','anio')),
  features text[] not null default '{}',
  active boolean not null default true,
  sort_order int not null default 0
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id text not null references public.plans(id),
  status text not null default 'activa' check (status in
    ('activa','prueba','pago_pendiente','cancelada','expirada')),
  provider text,                          -- pasarela (por definir)
  provider_customer_id text,
  provider_subscription_id text unique,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subscriptions_user_idx on public.subscriptions (user_id);
create index subscriptions_plan_idx on public.subscriptions (plan_id);

create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  kind text not null check (kind in ('fecha_limite','nueva_coincidencia','sistema')),
  title text not null,
  body text,
  send_at timestamptz not null default now(),
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, send_at desc);
create index notifications_opportunity_idx on public.notifications (opportunity_id);

-- ¿El usuario tiene una suscripción premium activa?
create or replace function public.has_premium(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = uid
      and s.plan_id <> 'gratis'
      and s.status in ('activa','prueba')
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.sources enable row level security;
alter table public.opportunities enable row level security;
alter table public.saved_opportunities enable row level security;
alter table public.applications enable row level security;
alter table public.import_runs enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_events enable row level security;
alter table public.notifications enable row level security;

-- Perfiles: cada quien ve y edita el suyo; admin ve todos
create policy "perfil propio: ver" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy "perfil propio: editar" on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- Fuentes y ejecuciones: solo admin (el importador usa la service role)
create policy "fuentes: admin" on public.sources for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "ejecuciones: admin" on public.import_runs for select to authenticated
  using ((select public.is_admin()));

-- Oportunidades: públicas si están publicadas; organizador ve/crea/edita las suyas; admin todo
create policy "oportunidades: ver" on public.opportunities for select to anon, authenticated
  using (
    status = 'publicada'
    or organizer_id = (select auth.uid())
    or (select public.is_admin())
  );
create policy "oportunidades: organizador crea" on public.opportunities for insert to authenticated
  with check (
    (select public.is_admin())
    or (
      organizer_id = (select auth.uid())
      and status in ('borrador','revision')
      and exists (select 1 from public.profiles p
                  where p.id = (select auth.uid()) and p.role = 'organizador')
    )
  );
create policy "oportunidades: organizador edita" on public.opportunities for update to authenticated
  using ((select public.is_admin()) or (organizer_id = (select auth.uid()) and status in ('borrador','revision','rechazada')))
  with check ((select public.is_admin()) or (organizer_id = (select auth.uid()) and status in ('borrador','revision')));
create policy "oportunidades: admin borra" on public.opportunities for delete to authenticated
  using ((select public.is_admin()));

-- Guardadas
create policy "guardadas: propias" on public.saved_opportunities for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Postulaciones
create policy "postulaciones: propias" on public.applications for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Planes: lectura pública
create policy "planes: ver" on public.plans for select to anon, authenticated using (active);

-- Suscripciones: el usuario solo las ve; las escribe el servidor (webhooks)
create policy "suscripciones: ver propias" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Eventos de pago: solo servidor (sin políticas = sin acceso desde el cliente)

-- Notificaciones: ver y marcar como leídas
create policy "notificaciones: ver propias" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "notificaciones: marcar leídas" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Funciones: no exponer las internas
revoke execute on function public.expire_past_deadlines() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile_role() from public, anon, authenticated;
revoke execute on function public.has_premium(uuid) from public, anon;
grant execute on function public.has_premium(uuid) to authenticated;
