-- Premium del usuario actual (reemplaza a has_premium(uuid), que dejamos sin acceso)
create or replace function public.user_has_premium()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = (select auth.uid())
      and s.plan_id <> 'gratis'
      and s.status in ('activa','prueba')
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;
revoke execute on function public.user_has_premium() from public, anon;
grant execute on function public.user_has_premium() to authenticated;
revoke execute on function public.has_premium(uuid) from authenticated;

-- Planes (precios provisionales: se ajustan al conectar la pasarela)
insert into public.plans (id, name, description, price_cents, currency, billing_interval, features, sort_order) values
  ('gratis', 'Gratis', 'Para empezar a explorar', 0, 'USD', null,
   array['Descubrir todas las oportunidades públicas','Guardar hasta 10 oportunidades','Seguimiento de postulaciones'], 0),
  ('premium_mensual', 'Premium', 'Para postular en serio', 499, 'USD', 'mes',
   array['Todo lo del plan Gratis','Recomendaciones "Para ti" ilimitadas','Oportunidades exclusivas','Alertas de fechas límite','Asistente de IA para tus postulaciones (próximamente)'], 1),
  ('premium_anual', 'Premium anual', 'Ahorra 33 % frente al plan mensual', 3999, 'USD', 'anio',
   array['Todo lo de Premium','Precio preferente pagando el año'], 2)
on conflict (id) do update set
  name = excluded.name, description = excluded.description, price_cents = excluded.price_cents,
  billing_interval = excluded.billing_interval, features = excluded.features, sort_order = excluded.sort_order;

-- Fuentes iniciales (priority 1 = implementar primero; tier 1 = oficial, 3 = agregador)
insert into public.sources (slug, name, url, kind, tier, language, region_focus, categories, frequency_hours, auto_publish, priority, notes) values
  ('becas-santander', 'Becas Santander (Santander Open Academy)', 'https://app.santanderopenacademy.com/es/programs', 'headless', 1, 'es', 'global',
   array['beca','curso'], 24, true, 1,
   'Cada beca tiene su propia página en app.santanderopenacademy.com/es/program/<slug>. Importar cada programa individual con su fecha de inscripción. Sitio con JavaScript: requiere navegador headless.'),
  ('fundacion-carolina', 'Fundación Carolina', 'https://gestion.fundacioncarolina.es/programas', 'html', 1, 'es', 'europa',
   array['beca'], 24, true, 1,
   'Más de 200 programas de posgrado/doctorado en España para iberoamericanos, cada uno en gestion.fundacioncarolina.es/programas/<id>. Convocatoria anual (normalmente enero–abril).'),
  ('senescyt-globo-comun', 'SENESCYT / Programa Globo Común (Ecuador)', 'https://siau.senescyt.gob.ec/convocatorias', 'html', 1, 'es', 'latinoamerica',
   array['beca','curso','intercambio'], 24, true, 1,
   'Becas internacionales y nacionales para ecuatorianos (Globo Común, Fulbright-SENESCYT, etc.). Las bases suelen venir en PDF: extraer con LLM.'),
  ('unv', 'Voluntarios de la ONU (UNV)', 'https://app.unv.org', 'headless', 1, 'en', 'global',
   array['voluntariado'], 12, true, 1,
   'Voluntariado en línea abierto a todas las nacionalidades + UN Youth Volunteers (18–26). Cada asignación es una oportunidad.'),
  ('oea-becas', 'Becas OEA', 'https://www.oas.org/es/becas/', 'html', 1, 'es', 'latinoamerica',
   array['beca','curso'], 48, true, 1, 'Becas de posgrado y cursos en alianza con universidades para ciudadanos de las Américas.'),
  ('opportunity-desk', 'Opportunity Desk', 'https://opportunitydesk.org/feed/', 'rss', 3, 'en', 'global',
   array['beca','congreso','fellowship','competencia','pasantia','liderazgo'], 6, false, 1,
   'Agregador grande y frecuente. Usar como radar: seguir el enlace a la fuente oficial y publicar con el link oficial. Requiere revisión.'),
  ('eurodesk', 'Eurodesk Opportunity Finder', 'https://programmes.eurodesk.eu', 'html', 1, 'en', 'europa',
   array['beca','intercambio','voluntariado','pasantia','competencia'], 72, false, 2,
   'Más de 250 programas verificados. Muchos son solo para residentes de la UE: filtrar por elegibilidad.'),
  ('erasmus-mundus', 'Catálogo Erasmus Mundus', 'https://www.eacea.ec.europa.eu/scholarships/erasmus-mundus-catalogue_en', 'html', 1, 'en', 'europa',
   array['beca'], 168, true, 2, 'Maestrías conjuntas con becas completas abiertas a todas las nacionalidades. Cada maestría es una oportunidad.'),
  ('daad', 'DAAD – Base de becas', 'https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/', 'html', 1, 'en', 'europa',
   array['beca','curso'], 168, true, 2, 'Filtrar por país de origen Ecuador / Latinoamérica.'),
  ('fulbright-ecuador', 'Comisión Fulbright Ecuador', 'https://fulbright.org.ec', 'html', 1, 'es', 'norteamerica',
   array['beca','intercambio'], 168, true, 2, null),
  ('chevening', 'Becas Chevening (Reino Unido)', 'https://www.chevening.org/scholarships/', 'html', 1, 'en', 'europa',
   array['beca'], 168, true, 2, 'Convocatoria anual (agosto–noviembre aprox.).'),
  ('un-careers', 'Pasantías de la ONU', 'https://careers.un.org', 'headless', 1, 'en', 'global',
   array['pasantia'], 24, true, 2, null),
  ('opportunities-for-youth', 'Opportunities for Youth', 'https://opportunitiesforyouth.org/feed/', 'rss', 3, 'en', 'global',
   array['beca','congreso','voluntariado','intercambio'], 12, false, 2, 'Agregador. Requiere revisión y link oficial.'),
  ('oyaop', 'OYA Opportunities (OYAOP)', 'https://oyaop.com/feed/', 'rss', 3, 'en', 'global',
   array['congreso','beca','intercambio','competencia'], 12, false, 2, 'Fuerte en congresos y cumbres juveniles. Agregador.'),
  ('youthop', 'Youth Opportunities (YouthOp)', 'https://www.youthop.com', 'html', 3, 'en', 'global',
   array['competencia','congreso','fellowship','pasantia','intercambio'], 24, false, 2, 'Agregador.'),
  ('indesgua', 'INDESGUA – Becas para latinoamericanos', 'https://indesgua.org.gt/feed/', 'rss', 3, 'es', 'latinoamerica',
   array['beca','voluntariado'], 24, false, 2, 'Agregador en español especializado en latinoamericanos.'),
  ('becas-com', 'Becas.com – Becas para latinoamericanos', 'https://www.becas.com/becas-para-latinoamericanos', 'html', 3, 'es', 'europa',
   array['beca'], 48, false, 3, 'Agregador centrado en estudiar en España.'),
  ('portal-juventud-ue', 'Portal Europeo de la Juventud (Cuerpo Europeo de Solidaridad)', 'https://youth.europa.eu/solidarity/placement_en', 'headless', 1, 'en', 'europa',
   array['voluntariado'], 48, true, 3, 'Muchas plazas solo para residentes de la UE o países asociados: filtrar elegibilidad.'),
  ('one-young-world', 'One Young World', 'https://www.oneyoungworld.com', 'html', 1, 'en', 'global',
   array['congreso','liderazgo'], 168, true, 3, 'Cumbre anual con becas para delegados.'),
  ('ylai', 'YLAI – Jóvenes Líderes de las Américas', 'https://ylai.state.gov', 'html', 1, 'es', 'norteamerica',
   array['liderazgo','fellowship'], 168, true, 3, 'Para emprendedores de América Latina y el Caribe.'),
  ('turkiye-burslari', 'Becas Türkiye (Gobierno de Turquía)', 'https://www.turkiyeburslari.gov.tr', 'html', 1, 'en', 'asia',
   array['beca'], 168, true, 3, null),
  ('stipendium-hungaricum', 'Stipendium Hungaricum (Hungría)', 'https://stipendiumhungaricum.hu', 'html', 1, 'en', 'europa',
   array['beca'], 168, true, 3, 'Ecuador es país socio.'),
  ('gks-corea', 'Becas del Gobierno de Corea (GKS)', 'https://www.studyinkorea.go.kr', 'html', 1, 'en', 'asia',
   array['beca'], 168, true, 3, null),
  ('mexico-amexcid', 'Becas del Gobierno de México para extranjeros (AMEXCID)', 'https://www.gob.mx/amexcid/acciones-y-programas/becas-para-extranjeros', 'html', 1, 'es', 'latinoamerica',
   array['beca'], 168, true, 3, null),
  ('scholarships-corner', 'Scholarships Corner', 'https://scholarshipscorner.website/feed', 'rss', 3, 'en', 'global',
   array['beca'], 24, false, 3, 'Agregador (fuente del prototipo). Baja confianza: solo como radar.'),
  ('opportunities-corners', 'Opportunities Corners', 'https://opportunitiescorners.com/feed', 'rss', 3, 'en', 'global',
   array['beca','congreso','pasantia'], 24, false, 3, 'Agregador (fuente del prototipo). Baja confianza: solo como radar.')
on conflict (slug) do nothing;

-- Expiración diaria automática (00:15 hora de Ecuador = 05:15 UTC)
create extension if not exists pg_cron;
select cron.schedule('expirar-oportunidades', '15 5 * * *', $$select public.expire_past_deadlines()$$);

-- Función interna creada por Supabase: no exponerla por la API
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
