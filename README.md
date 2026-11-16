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

Base de datos: `supabase/migrations/`. Tablas principales: `profiles`, `sources`, `opportunities`, `saved_opportunities`, `applications`, `import_runs`, `import_pages`, `plans`, `subscriptions`, `payment_events`, `notifications`.

- Las oportunidades se ven públicamente solo con `status = 'publicada'`.
- Un cron diario (`expirar-oportunidades`) marca como `expirada` todo lo que pasó su fecha límite. No se borran, para no romper guardados ni historial.
- `fingerprint` (único) y `canonical_url` sirven para deduplicar en el importador.

## Importador

Código en `src/importer/` (independiente de Next.js: corre con `tsx` y no entra en el bundle de la app). Se ejecuta solo en GitHub Actions cada 6 horas (`.github/workflows/importador.yml`) y también a mano desde la pestaña **Actions**.

**Regla de oro:** una oportunidad = un registro, con el link de postulación de ESA oportunidad.

Cómo trabaja con cada fuente:

1. **Lista** las oportunidades que publica la fuente (conector en `src/importer/connectors/`).
2. **Visita** la página de detalle de cada una (y sus bases en PDF o ZIP cuando existen).
3. Calcula un **hash** del contenido: solo llama a la **IA** (Gemini; Claude si hay `ANTHROPIC_API_KEY`) si la página es nueva o cambió.
4. **Normaliza** (slug, URL canónica, `fingerprint`) y **deduplica**: si un agregador y la fuente oficial publican lo mismo, queda un solo registro con el link oficial.
5. **Publica** si `sources.auto_publish` es true y están los datos clave; si no, la manda a **revisión** (`/admin`). Calcula `trust_score` (0–100).
6. **Expira** lo que la fuente marca como cerrado o lo que deja de aparecer 3 ejecuciones seguidas.
7. **Registra** la ejecución en `import_runs` y actualiza `sources.last_run_at`. Tres fallos seguidos → `con_errores`.

Buenas prácticas: respeta `robots.txt`, máximo 1 petición por segundo por dominio y User-Agent `YouthMatchBot`. Nunca copia párrafos ni imágenes de la fuente.

```bash
npm run importar                          # las fuentes a las que les toca
npm run importar -- --fuente=oea-becas    # una sola fuente
npm run importar -- --todas --max=10      # todas, con tope de páginas
npm run test:importador                   # pruebas de los parsers (páginas reales en __fixtures__/)
```

**Añadir una fuente:** inserta la fila en `sources`, crea su conector (o reutiliza `rssConnector()` para cualquier agregador con RSS) y regístralo en `src/importer/connectors/index.ts` con el mismo `slug`. Guarda una página de ejemplo en `__fixtures__/` y añade su prueba.

Estado de cada fuente y notas técnicas: `docs/fuentes.md`.

## Pagos (pendiente de elegir pasarela)

`src/lib/payments/index.ts` define la interfaz `PaymentProvider`. El webhook genérico `/api/webhooks/pagos/[provider]` ya registra eventos (idempotentes) y actualiza `subscriptions`. El acceso premium se consulta con la función `user_has_premium()`.

## Variables de entorno

Ver `.env.example`. En Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL` y `SUPABASE_SECRET_KEY`. El importador usa los secretos de GitHub Actions: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `GEMINI_API_KEY` y, opcional, `ANTHROPIC_API_KEY`.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # y completa los valores
npm run dev
```

Para hacerte admin: en Supabase → SQL, `update profiles set role = 'admin' where id = '<tu-user-id>';`
