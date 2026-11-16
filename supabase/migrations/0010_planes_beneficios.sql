-- Beneficios reales de cada plan (2026-11-16)
update public.plans set features = array[
  '10 oportunidades recomendadas para ti cada semana',
  'Explorar el catálogo completo',
  'Guardar hasta 10 oportunidades',
  'Seguimiento de postulaciones'
] where id = 'gratis';

update public.plans set features = array[
  'Recomendaciones para ti sin límite',
  'Guardar oportunidades sin límite',
  'Alertas por correo antes de cada fecha límite',
  'Seguimiento de postulaciones',
  'IA Studio: asistente para tus postulaciones (próximamente)'
] where id = 'premium_mensual';

update public.plans set features = array[
  'Todo lo de Premium',
  'Ahorra 33 % frente al plan mensual'
], description = 'Un año completo para postular con calma' where id = 'premium_anual';
