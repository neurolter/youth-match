-- Correos a los usuarios: preferencias, baja con un clic y registro de envíos.

alter table public.profiles
  add column if not exists notify_deadlines boolean not null default true,   -- "se acerca la fecha límite"
  add column if not exists notify_weekly boolean not null default true,      -- resumen semanal de los lunes
  add column if not exists notify_country boolean not null default true,     -- nueva oportunidad en tu país
  add column if not exists welcome_sent_at timestamptz,
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

create unique index if not exists profiles_unsubscribe_token_idx on public.profiles (unsubscribe_token);

-- Registro de cada correo enviado. `dedupe_key` evita mandar dos veces el mismo aviso.
create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('bienvenida', 'fecha_limite', 'resumen_semanal', 'nueva_en_tu_pais')),
  opportunity_id uuid references public.opportunities(id) on delete set null,
  dedupe_key text not null unique,
  provider_id text,
  sent_at timestamptz not null default now()
);
create index if not exists email_log_user_idx on public.email_log (user_id, sent_at desc);
create index if not exists email_log_opportunity_idx on public.email_log (opportunity_id);
alter table public.email_log enable row level security;
-- Sin políticas: solo el servidor (clave secreta) lee y escribe.

-- Baja con un clic desde el correo, sin iniciar sesión (el token es secreto y único por usuario).
create or replace function public.email_unsubscribe(token uuid, kind text default 'todos')
returns boolean language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  update public.profiles set
    notify_deadlines = case when kind in ('todos', 'fecha_limite') then false else notify_deadlines end,
    notify_weekly    = case when kind in ('todos', 'resumen_semanal') then false else notify_weekly end,
    notify_country   = case when kind in ('todos', 'nueva_en_tu_pais') then false else notify_country end
  where unsubscribe_token = token;
  get diagnostics n = row_count;
  return n > 0;
end $$;
revoke execute on function public.email_unsubscribe(uuid, text) from public;
grant execute on function public.email_unsubscribe(uuid, text) to anon, authenticated;
