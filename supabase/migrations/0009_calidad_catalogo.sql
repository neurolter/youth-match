-- Calidad del catálogo (aplicado el 2026-11-16).

-- Baja confianza: a revisión (pueden ser eventos que cobran inscripción)
update public.opportunities set status = 'revision', published_at = null,
  review_notes = trim(coalesce(review_notes, '') || ' Confianza baja: revisa si cobra inscripción antes de publicar.')
where status = 'publicada' and trust_score < 45;

-- "Siempre abierta" y fecha límite a la vez no tiene sentido: manda la fecha
update public.opportunities set rolling_deadline = false where rolling_deadline and deadline is not null;

-- Para ordenar: las limitadas a 1-2 nacionalidades van al final para quien no ha iniciado sesión
alter table public.opportunities add column if not exists few_countries boolean
  generated always as (cardinality(eligible_nationalities) between 1 and 2) stored;
