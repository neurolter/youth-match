-- Fuente para "Agregar por enlace" (admin) y feed de conferencias de Opportunities Corners.
-- Además, se pausan las fuentes que bloquean el acceso automático (no se evade su protección).
insert into public.sources (slug, name, url, kind, tier, language, region_focus, categories, frequency_hours, auto_publish, priority, status, notes) values
 ('carga-manual', 'Carga manual (Agregar por enlace)', 'https://youth-matchdos.vercel.app/admin/agregar', 'manual', 1, 'es', 'global', '{}', 8760, false, 3, 'pausada',
  'Oportunidades que el admin agrega pegando un enlace en /admin/agregar. El importador automático no la ejecuta.'),
 ('opportunities-corners-conferencias', 'Opportunities Corners – Conferencias', 'https://opportunitiescorners.com/category/conferences/feed/', 'rss', 3, 'en', 'global', array['congreso','liderazgo'], 12, false, 1, 'activa',
  'Solo la categoría Conferences de opportunitiescorners.com. Seguir cada publicación hasta la organización oficial. Requiere revisión.')
on conflict (slug) do nothing;

update public.sources set status = 'pausada',
  notes = coalesce(notes, '') || ' | PAUSADA: el sitio bloquea el acceso automático (403 / anti-bots). Cargar con /admin/agregar o pedir un feed a la organización.'
where slug in ('oea-becas', 'one-young-world', 'opportunities-for-youth', 'unv', 'opportunity-desk');
