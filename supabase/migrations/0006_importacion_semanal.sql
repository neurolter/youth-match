-- Importación semanal: todas las fuentes automáticas pasan a ~7 días.
-- Se usa 160 h (y no 168) para que ninguna se salte una semana si GitHub
-- arranca el workflow unos minutos antes o después.
update public.sources set frequency_hours = 160 where kind <> 'manual';
