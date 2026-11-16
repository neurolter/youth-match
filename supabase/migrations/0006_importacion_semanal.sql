-- Importación semanal: todas las fuentes automáticas pasan a ~7 días.
-- Se usa 160 h (y no 168) para que ninguna se salte una semana si GitHub
-- arranca el workflow unos minutos antes o después.
update public.sources set frequency_hours = 160 where kind <> 'manual';

-- Para encontrar rápido si otra fuente ya procesó la misma publicación (ahorro de IA).
create index if not exists import_pages_url_hash_idx on public.import_pages (url, content_hash);
