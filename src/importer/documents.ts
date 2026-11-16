// Lectura de las bases en PDF (y de los ZIP que traen PDF dentro, como en SENESCYT).
import { unzipSync } from "fflate";
import type { Http } from "./http";

const MAX_BYTES = 15 * 1024 * 1024;

export async function pdfToText(data: Uint8Array, maxPages = 12): Promise<string> {
  // Import dinámico: `unpdf` solo se carga cuando de verdad hay un PDF que leer.
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(data);
  const { text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [String(text)];
  return pages.slice(0, maxPages).join("\n").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}

const isPdf = (d: Uint8Array) => d[0] === 0x25 && d[1] === 0x50 && d[2] === 0x44 && d[3] === 0x46; // %PDF
const isZip = (d: Uint8Array) => d[0] === 0x50 && d[1] === 0x4b; // PK

/**
 * Descarga un documento de bases y devuelve su texto. Acepta PDF o ZIP con PDF.
 * Devuelve "" si no se puede leer (escaneado, protegido, demasiado grande...).
 */
export async function documentText(http: Http, url: string, maxChars = 12000): Promise<string> {
  try {
    const { data } = await http.bytes(url, { timeoutMs: 60000 });
    if (data.byteLength > MAX_BYTES) return "";
    let text = "";
    if (isPdf(data)) {
      text = await pdfToText(data);
    } else if (isZip(data)) {
      const files = unzipSync(data, { filter: (f) => /\.pdf$/i.test(f.name) && f.originalSize < MAX_BYTES });
      // Primero el archivo que parezca "bases" o "convocatoria"; como mucho 2 PDF.
      const names = Object.keys(files).sort(
        (a, b) => Number(/base|convocatoria/i.test(b)) - Number(/base|convocatoria/i.test(a)),
      );
      for (const name of names.slice(0, 2)) {
        text += `\n[${name}]\n${await pdfToText(files[name])}`;
        if (text.length > maxChars) break;
      }
    }
    return text.trim().slice(0, maxChars);
  } catch {
    return "";
  }
}
