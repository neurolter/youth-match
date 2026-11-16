// Navegador headless (Playwright) para los sitios que solo funcionan con JavaScript.
// Se abre una sola vez, y solo si algún conector lo pide.
import { USER_AGENT } from "./config";
import type { BrowserPage } from "./types";

type Closable = { close(): Promise<void> };
type Ctx = { newPage(): Promise<unknown> } & Closable;

let browser: Closable | null = null;
let context: Ctx | null = null;

export async function newPage(): Promise<BrowserPage> {
  if (!context) {
    // Import dinámico: Playwright no se carga (ni hace falta tenerlo instalado)
    // cuando solo se ejecutan fuentes RSS o HTML.
    const { chromium } = await import("playwright");
    const b = await chromium.launch({ headless: true });
    browser = b;
    context = (await b.newContext({ userAgent: USER_AGENT, locale: "es-EC" })) as unknown as Ctx;
  }
  return (await context.newPage()) as BrowserPage;
}

export async function closeBrowser() {
  await context?.close().catch(() => {});
  await browser?.close().catch(() => {});
  context = null;
  browser = null;
}
