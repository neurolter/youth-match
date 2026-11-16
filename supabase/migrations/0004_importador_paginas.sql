-- Memoria del importador: una fila por página de detalle vista en cada fuente.
-- Sirve para (1) llamar a la IA solo si la página es nueva o cambió (content_hash)
-- y (2) contar cuántas ejecuciones seguidas lleva sin aparecer (missed_runs).
-- (Ya aplicada en producción el 16-nov-2026 como "importador_paginas".)
create table if not exists public.import_pages (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete cascade,
  url text not null,
  external_id text,
  content_hash text,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  missed_runs integer not null default 0,
  last_result text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (source_id, url)
);
create index if not exists import_pages_opportunity_idx on public.import_pages (opportunity_id);
alter table public.import_pages enable row level security;
-- Sin políticas: solo la clave secreta (importador) puede leer o escribir.

create index if not exists opportunities_canonical_url_idx on public.opportunities (canonical_url);
create index if not exists opportunities_source_external_idx on public.opportunities (source_id, external_id);
