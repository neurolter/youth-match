import { Award, Briefcase, Globe2, Languages, Mail, MapPin, Quote } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { CONTACT_EMAIL, FOUNDER, FOUNDER_HANDLE } from "@/lib/site";

// Datos tal como los entregó el fundador: no agregar cargos ni logros que no estén aquí.
const FORUMS = [
  "Foro Económico Internacional de San Petersburgo (SPIEF)",
  "International BRICS School",
  "Aspire Institute (Harvard)",
  "ISWINT (Rumania)",
];

const ROLES = [
  "COO de Soluciones Educativas y FranklinCovey Education – Ecuador",
  "Fundador y Director de Youth Match",
  "Cofundador y COO de LICAM-J, programa de liderazgo juvenil y diplomacia",
  "Asesor experto en innovación tecnológica, startups e internacionalización",
];

const FIRSTS = [
  "Primer latino en la historia de la Universidad ITMO en irse de intercambio a Chile.",
  "Primero en graduarse de ITMO desarrollando su propia startup, con el modelo «startup como tesis».",
];

export function FounderSection() {
  return (
    <section id="fundador" className="mx-auto max-w-6xl scroll-mt-6 px-4 pt-16 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-500">Sobre el fundador</p>
      <h2 className="mt-2 max-w-3xl text-3xl font-bold text-navy sm:text-4xl">Creado por alguien que ya hizo el viaje</h2>

      <div className="mt-8 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        {/* Credencial del fundador */}
        <div className="bg-globe grain relative flex flex-col overflow-hidden rounded-[2rem] p-7 text-white sm:p-8">
          <div className="relative flex items-center gap-4">
            <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-accent font-display text-2xl font-extrabold">SG</div>
            <div className="min-w-0">
              <p className="font-display text-xl font-bold leading-tight">{FOUNDER}</p>
              <p className="mt-0.5 text-sm text-white/60">{FOUNDER_HANDLE} · Fundador y Director</p>
            </div>
          </div>

          <dl className="relative mt-7 space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-accent-400" />
              <dd className="text-white/80">Emprendedor ecuatoriano radicado en Quito</dd>
            </div>
            <div className="flex items-start gap-3">
              <Award className="mt-0.5 size-4 shrink-0 text-accent-400" />
              <dd className="text-white/80">Especialista en innovación, internacionalización y liderazgo juvenil</dd>
            </div>
            <div className="flex items-start gap-3">
              <Languages className="mt-0.5 size-4 shrink-0 text-accent-400" />
              <dd className="text-white/80">Habla español, inglés y ruso</dd>
            </div>
          </dl>

          {/* Su ruta: Quito → San Petersburgo → Santiago */}
          <div className="relative mt-8 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">Su ruta</p>
            <div className="mt-3 flex items-center justify-between gap-2">
              {[
                ["UIO", "Quito"],
                ["LED", "San Petersburgo"],
                ["SCL", "Santiago"],
              ].map(([code, city], i) => (
                <div key={code} className="contents">
                  {i > 0 && <span className="h-px flex-1 border-t border-dashed border-accent-400/60" aria-hidden />}
                  <div className="text-center">
                    <p className="font-display text-2xl font-extrabold leading-none">{code}</p>
                    <p className="mt-1 text-[11px] text-white/55">{city}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mt-auto pt-8">
            <div className="border-t border-white/12 pt-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">Misión</p>
              <p className="mt-2 font-display text-xl font-bold leading-snug">
                Construir puentes entre la juventud latinoamericana y las{" "}
                <span className="text-gradient-accent">oportunidades internacionales</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Historia y trayectoria */}
        <div className="space-y-5">
          <div className="rounded-[2rem] bg-white p-7 ring-1 ring-navy/8 sm:p-8">
            <h3 className="text-lg font-bold text-navy">Su historia</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink/70">
              A los 18 años salió de Ecuador para estudiar en Rusia sin hablar ruso. Se formó en Business and Management in Technological
              Innovations en la Universidad ITMO (San Petersburgo) e hizo un intercambio en Ingeniería Comercial en la Universidad Finis
              Terrae (Santiago de Chile).
            </p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {FIRSTS.map((f) => (
                <li key={f} className="rounded-2xl bg-paper p-4 text-sm font-medium leading-snug text-navy">
                  <span className="mb-1 block font-display text-xs font-bold uppercase tracking-[0.14em] text-accent-600">Primero</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[2rem] bg-white p-7 ring-1 ring-navy/8 sm:p-8">
            <h3 className="flex items-center gap-2 text-lg font-bold text-navy">
              <Globe2 className="size-5 text-accent-500" /> Trayectoria internacional
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink/70">
              Ha participado en foros y programas en más de 5 países, en algunos como delegado oficial de Ecuador. Ha trabajado como
              mediador e intérprete de delegaciones internacionales y ha cerrado negociaciones internacionales B2G de alto nivel. Recibió
              una beca del Instituto Europeo de Posgrado (IEP), que le entregaron en la Asamblea Nacional del Ecuador.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {FORUMS.map((f) => (
                <li key={f} className="rounded-full bg-navy/[0.05] px-3 py-1.5 text-xs font-semibold text-navy/80">
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[2rem] bg-white p-7 ring-1 ring-navy/8 sm:p-8">
            <h3 className="flex items-center gap-2 text-lg font-bold text-navy">
              <Briefcase className="size-5 text-accent-500" /> Hoy
            </h3>
            <ul className="mt-3 space-y-2">
              {ROLES.map((r) => (
                <li key={r} className="flex gap-2.5 text-[15px] text-ink/75">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-500" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Por qué y contacto */}
      <div className="mt-5 grid gap-5 rounded-[2rem] bg-white p-7 ring-1 ring-navy/8 sm:p-10 md:grid-cols-[1.4fr_1fr] md:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-500">Por qué creó Youth Match</p>
          <blockquote className="relative mt-5">
            <Quote className="absolute -left-2 -top-5 size-9 text-accent-500/15" aria-hidden />
            <p className="relative font-display text-2xl font-bold leading-snug text-navy">
              A muchos jóvenes latinoamericanos no les falta talento: les faltan puentes, redes e información.
            </p>
          </blockquote>
          <p className="mt-4 text-[15px] leading-relaxed text-ink/65">
            Por eso Youth Match reúne en un solo lugar becas, foros, congresos, festivales y programas internacionales, para que encuentres
            oportunidades, armes un portafolio fuerte y postules con más facilidad.
          </p>
        </div>
        <div id="contacto" className="rounded-2xl bg-paper p-5">
          <p className="text-sm font-semibold text-navy">¿Tienes una pregunta, una sugerencia o una oportunidad para compartir?</p>
          <a href={`mailto:${CONTACT_EMAIL}`} className={buttonClass("primary", "md", "mt-4 w-full")}>
            <Mail className="size-4" /> {CONTACT_EMAIL}
          </a>
        </div>
      </div>
    </section>
  );
}
