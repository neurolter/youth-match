-- Fuentes pedidas por Sebastian: pasan a prioridad 1
update public.sources set priority = 1 where slug in ('opportunities-corners', 'scholarships-corner', 'one-young-world');
insert into public.sources (slug, name, url, kind, tier, language, region_focus, categories, frequency_hours, auto_publish, priority, notes)
values ('youthop-conferencias', 'YouthOp – Conferencias', 'https://www.youthop.com/conferences', 'html', 3, 'en', 'global',
  array['congreso','liderazgo'], 12, false, 1,
  'Sección de conferencias de YouthOp. Cada conferencia listada es una oportunidad; seguir el enlace a la organización oficial. Requiere revisión.')
on conflict (slug) do update set priority = 1, url = excluded.url;
