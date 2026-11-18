import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { MAX_CV_CHARS, MAX_PDF_BYTES, MIN_PDF_CHARS } from "./limits";

export type PdfExtract =
  | { ok: true; text: string; chars: number }
  | {
      ok: false;
      code: "too-large" | "not-pdf" | "encrypted" | "image-only" | "empty" | "incomplete";
      message: string;
    };

type PdfjsAssets = { cMapUrl: string; standardFontDataUrl: string };

declare global {
  // eslint-disable-next-line no-var
  var __PRANCHETA_PDFJS__: PdfjsAssets | undefined;
}

function latin1(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => String.fromCharCode(b)).join("");
}

function assets(): PdfjsAssets {
  if (globalThis.__PRANCHETA_PDFJS__) return globalThis.__PRANCHETA_PDFJS__;
  return { cMapUrl: "/pdfjs/cmaps/", standardFontDataUrl: "/pdfjs/standard_fonts/" };
}

function configureWorker(): void {
  if (GlobalWorkerOptions.workerSrc) return;
  GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
}

function leftoverHex(text: string): boolean {
  return /<[0-9A-Fa-f]{8,}>/.test(text);
}

export async function extractPdfText(bytes: Uint8Array): Promise<PdfExtract> {
  if (bytes.byteLength > MAX_PDF_BYTES) {
    return {
      ok: false,
      code: "too-large",
      message: `PDF maior que ${MAX_PDF_BYTES} bytes. Use um arquivo menor ou cole o texto.`,
    };
  }
  if (bytes.byteLength < 5 || latin1(bytes.subarray(0, 5)) !== "%PDF-") {
    return { ok: false, code: "not-pdf", message: "Isso não parece um PDF (%PDF- ausente)." };
  }
  const raw = latin1(bytes);
  if (/\/Encrypt\b/.test(raw)) {
    return {
      ok: false,
      code: "encrypted",
      message: "PDF com senha/criptografia. Cole o texto; não quebramos senha daqui.",
    };
  }

  configureWorker();
  const { cMapUrl, standardFontDataUrl } = assets();
  try {
    const task = getDocument({
      data: bytes.slice(),
      password: "",
      stopAtErrors: true,
      isEvalSupported: false,
      useSystemFonts: true,
      useWasm: false,
      disableFontFace: true,
      verbosity: 0,
      cMapUrl,
      cMapPacked: true,
      standardFontDataUrl,
    });
    const pdf = await task.promise;
    const parts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i += 1) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      for (const item of content.items) {
        if (item && typeof item === "object" && "str" in item && typeof item.str === "string" && item.str) {
          parts.push(item.str);
        }
      }
    }
    await pdf.destroy();
    const text = parts.join(" ").replace(/\s+/g, " ").trim();
    if (text.length > MAX_CV_CHARS) {
      return {
        ok: false,
        code: "incomplete",
        message: `O texto do PDF excede ${MAX_CV_CHARS} caracteres. Nada foi importado; reduza o conteúdo ou cole o texto manualmente.`,
      };
    }
    if (leftoverHex(text)) {
      return {
        ok: false,
        code: "incomplete",
        message:
          "Extração incompleta (hex/CID sem mapa). Não gravamos texto parcial. Cole o currículo.",
      };
    }
    if (!text) {
      return {
        ok: false,
        code: "empty",
        message: "PDF sem texto extraível. Cole o texto no campo.",
      };
    }
    if (text.length < MIN_PDF_CHARS) {
      return {
        ok: false,
        code: "image-only",
        message:
          "PDF parece imagem/scan (pouco ou nenhum texto selecionável). Cole o texto; não fazemos OCR.",
      };
    }
    return { ok: true, text, chars: text.length };
  } catch (err) {
    const msg = String(err);
    if (/password|encrypt/i.test(msg)) {
      return {
        ok: false,
        code: "encrypted",
        message: "PDF com senha/criptografia. Cole o texto; não quebramos senha daqui.",
      };
    }
    return {
      ok: false,
      code: "incomplete",
      message:
        "Não extraímos este PDF por completo (filtros/fontes). Não mostramos recorte como currículo. Cole o texto.",
    };
  }
}
