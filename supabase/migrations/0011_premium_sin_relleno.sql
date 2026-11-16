update public.plans set features = array[
  'Todo lo del plan Gratis',
  'Recomendaciones para ti sin límite',
  'Guardar oportunidades sin límite',
  'Alertas por correo antes de cada fecha límite',
  'IA Studio: asistente para tus postulaciones (próximamente)'
] where id = 'premium_mensual';
