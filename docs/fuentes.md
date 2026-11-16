# Fuentes de oportunidades

Investigación de noviembre de 2026, en inglés y en español. Todas están cargadas en la tabla `sources`.

**Criterios:** que la fuente sea oficial (tier 1) o un agregador (tier 3), que sea relevante para jóvenes latinoamericanos y ecuatorianos, cuántas oportunidades individuales publica y qué tan fácil es importarla.

**Regla de oro:** una oportunidad = un registro, con el link a la postulación de ESA oportunidad. Los agregadores se usan como radar: se sigue su enlace a la fuente oficial y se publica con el link oficial, pasando por revisión.

## Prioridad 1: implementar primero

| Fuente | Tipo | Por qué |
|---|---|---|
| Becas Santander (Santander Open Academy) | headless | Cada beca tiene su página propia (`app.santanderopenacademy.com/es/program/<slug>`). Muchas convocatorias abiertas para Latinoamérica. Era el caso que fallaba en el prototipo. |
| Fundación Carolina | html | Más de 200 programas en España para iberoamericanos, cada uno en `gestion.fundacioncarolina.es/programas/<id>`. Es estacional (enero–abril). |
| SENESCYT / Globo Común | html + PDF | Becas internacionales para ecuatorianos (Globo Común, Fulbright-SENESCYT). Muy relevante para el mercado inicial. |
| Voluntarios ONU (UNV) | headless | Voluntariado en línea abierto a todas las nacionalidades y UN Youth Volunteers (18–26 años). Publica todo el año. |
| Becas OEA | html | Becas de posgrado y cursos para ciudadanos de las Américas, en español. |
| Opportunity Desk | rss | El agregador más grande y frecuente en inglés. Sirve de radar para congresos, fellowships y competencias. |
| Opportunities Corners | rss | Pedida por Sebastian. Agregador: seguir cada publicación hasta la fuente oficial. |
| Scholarships Corner | rss | Pedida por Sebastian. Agregador de becas: seguir cada publicación hasta la fuente oficial. |
| One Young World | html | Pedida por Sebastian. Cumbre anual y becas de delegado. |
| YouthOp – Conferencias (`youthop.com/conferences`) | html | Pedida por Sebastian. Cada conferencia listada es una oportunidad. |

## Prioridad 2

Eurodesk Opportunity Finder (más de 250 programas verificados; ojo: muchos son solo para la UE), catálogo Erasmus Mundus, DAAD, Fulbright Ecuador, Chevening, pasantías de la ONU, Opportunities for Youth, OYAOP (fuerte en congresos juveniles), YouthOp e INDESGUA (agregador en español especializado en latinoamericanos).

## Prioridad 3

Becas.com, Portal Europeo de la Juventud, One Young World, YLAI, Türkiye Burslari, Stipendium Hungaricum (Ecuador es país socio), GKS Corea, AMEXCID México.

## Descartadas

- **Canal de Telegram del prototipo**: no se puede verificar, es de baja confianza y es difícil de atribuir.

## Estado de los conectores (noviembre de 2026)

| Fuente | Conector | Cómo se lee |
|---|---|---|
| Becas Santander | `santander.ts` | Sitemaps públicos (`/sitemaps/soa-courses-es.xml`, `soa-grants-es.xml`) + la API JSON pública que usa su página (`api-manager.universia.net/.../programs/<slug>`); navegador headless como plan B. Da estado (abierta/cerrada), fecha en hora de Madrid y países elegibles. Ojo: `/es/programs` ya no existe (404). |
| Fundación Carolina | `carolina.ts` | HTML. El listado marca cada programa con «Plazo Cerrado»; solo se visitan los abiertos. |
| SENESCYT / Globo Común | `senescyt.ts` | WordPress. Índices `/convocatorias/`, `/becas-cuarto-nivel/` y `/becas-tercer-nivel/`. Cada página trae «POSTULA HASTA» y las bases en PDF o ZIP (se leen ambos). |
| Voluntarios ONU | `unv.ts` | Solo headless (sitio protegido contra bots). Usa la búsqueda JSON de la propia página. Descarta asignaciones nacionales fuera de Latinoamérica. |
| Becas OEA | `oea.ts` | La página enlaza las convocatorias en PDF; se lee cada PDF. |
| One Young World | `one-young-world.ts` | HTML: `/scholarships` → `/scholarship/<slug>`. |
| Opportunity Desk, Opportunities Corners, Scholarships Corner | `rss.ts` | RSS + página de cada publicación; se sigue el enlace a la fuente oficial. |
| YouthOp – Conferencias | `youthop.ts` | HTML. **Sin verificar:** el sitio respondía error 524 al construir el conector. |
| Opportunities for Youth, OYAOP, INDESGUA | `rss.ts` | Mismo conector genérico de RSS. |

**Pendientes (sin conector):** Chevening, DAAD, Erasmus Mundus, Eurodesk, Fulbright Ecuador, pasantías ONU, YouthOp general, GKS Corea, AMEXCID, Portal Europeo de la Juventud, Stipendium Hungaricum, Türkiye Burslari, YLAI, Becas.com. Son programas de una sola convocatoria anual o bases de datos con buscador: cada uno necesita su conector propio.
