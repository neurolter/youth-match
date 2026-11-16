"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, X } from "lucide-react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const KEY = "ym-instalar-cerrado";

const noop = () => () => {};
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);

// "Cerrado" guardado en el navegador, con aviso a los componentes cuando cambia
const dismissListeners = new Set<() => void>();
const readDismissed = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};
const subscribeDismissed = (cb: () => void) => {
  dismissListeners.add(cb);
  return () => dismissListeners.delete(cb);
};
const dismiss = () => {
  try {
    localStorage.setItem(KEY, "1");
  } catch {}
  dismissListeners.forEach((cb) => cb());
};

function useInstall() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [justInstalled, setJustInstalled] = useState(false);
  const standalone = useSyncExternalStore(noop, isStandalone, () => true);
  const ios = useSyncExternalStore(noop, isIos, () => false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    const onInstalled = () => setJustInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    setEvent(null);
  };

  return { canPrompt: !!event, ios, installed: standalone || justInstalled, install };
}

/** Aviso en el celular para instalar la app (se puede cerrar). */
export function InstallBanner() {
  const { canPrompt, ios, installed, install } = useInstall();
  const hidden = useSyncExternalStore(subscribeDismissed, readDismissed, () => true);

  if (installed || hidden || (!canPrompt && !ios)) return null;

  return (
    <div className="mb-6 flex items-center gap-3 rounded-[1.2rem] bg-navy p-3.5 pr-2 text-white shadow-lg shadow-navy/20 sm:hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192.png" alt="" width={40} height={40} className="size-10 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">Instala Youth Match</p>
        <p className="text-xs text-white/65">
          {ios ? (
            <>
              Toca <Share className="inline size-3.5 -translate-y-px" /> y luego «Agregar a inicio».
            </>
          ) : (
            "Ábrela desde tu pantalla de inicio, como una app."
          )}
        </p>
      </div>
      {canPrompt && (
        <button onClick={install} className="shrink-0 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-navy">
          Instalar
        </button>
      )}
      <button onClick={dismiss} aria-label="Cerrar" className="grid size-8 shrink-0 place-items-center rounded-full text-white/60 hover:text-white">
        <X className="size-4" />
      </button>
    </div>
  );
}

/** Sección fija en el perfil para instalar la app. */
export function InstallSection() {
  const { canPrompt, ios, installed, install } = useInstall();
  if (installed) return null;
  return (
    <section className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-navy/10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192.png" alt="" width={44} height={44} className="size-11 shrink-0 rounded-xl ring-1 ring-navy/10" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-navy">Youth Match en tu celular</p>
        <p className="text-xs text-ink/55">
          {canPrompt
            ? "Instálala y ábrela como cualquier app, sin pasar por la tienda."
            : ios
              ? "En Safari, toca Compartir y luego «Agregar a inicio»."
              : "En el celular, abre el menú del navegador y elige «Instalar app» o «Agregar a pantalla de inicio»."}
        </p>
      </div>
      {canPrompt && (
        <button onClick={install} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">
          <Download className="size-4" /> Instalar
        </button>
      )}
    </section>
  );
}
