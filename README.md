# Youth Match

Plataforma web (en español) para que jóvenes de Latinoamérica descubran y organicen oportunidades internacionales: becas, intercambios, congresos, voluntariados, pasantías, programas de liderazgo y más.

## Stack

- **Next.js 16** (App Router, Server Actions, `proxy.ts` para la sesión) + TypeScript + Tailwind CSS 4
- **Supabase**: Auth (correo + contraseña, enlace mágico, Google), Postgres con RLS, pg_cron
- **Vercel** para el deploy

## Estructura

| Ruta | Qué hace |
|---|---|
| `/` | Landing pública |
| `/descubrir` | Catálogo con búsqueda y filtros (público) |
| `/oportunidad/[slug]` | Detalle, guardar, seguir postulación, link oficial |
| `/para-ti` | Recomendaciones según el perfil (`src/lib/opportunities.ts → matchOpportunities`) |
| `/guardadas`, `/postulaciones` | Guardadas y seguimiento por estado |
| `/onboarding`, `/perfil` | Perfil en 3 pasos / edición |
| `/planes` | Planes (pagos listos para conectar) |
| `/studio` | IA para postulaciones (fase 2) |
| `/admin` | Fuentes, cola de revisión y ejecuciones del importador (solo rol `admin`) |

Base de datos: `supabase/migrations/`. Tablas principales: `profiles`, `sources`, `opportunities`, `saved_opportunities`, `applications`, `import_runs`, `plans`, `subscriptions`, `payment_events`, `notifications`.

- Las oportunidades se ven públicamente solo con `status = 'publicada'`.
- Un cron diario (`expirar-oportunidades`) marca como `expirada` todo lo que pasó su fecha límite. No se borran, para no romper guardados ni historial.
- `fingerprint` (único) y `canonical_url` sirven para deduplicar en el importador.

## Importador (pendiente)

Las 26 fuentes iniciales están en la tabla `sources`, con prioridad, tipo (`rss`, `html`, `headless`, `api`) y notas. El importador debe escribir con la clave secreta (`createAdminClient()` en `src/lib/supabase/server.ts`) y registrar cada ejecución en `import_runs`. Ver `docs/fuentes.md`.

## Pagos (pendiente de elegir pasarela)

`src/lib/payments/index.ts` define la interfaz `PaymentProvider`. El webhook genérico `/api/webhooks/pagos/[provider]` ya registra eventos (idempotentes) y actualiza `subscriptions`. El acceso premium se consulta con la función `user_has_premium()`.

## Variables de entorno

Ver `.env.example`. En Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL` y, para el importador, `SUPABASE_SECRET_KEY`.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # y completa los valores
npm run dev
```

Para hacerte admin: en Supabase → SQL, `update profiles set role = 'admin' where id = '<tu-user-id>';`
