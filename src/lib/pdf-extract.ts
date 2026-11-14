import { inflateSync, unzlibSync } from "fflate";
import { MAX_CV_CHARS, MAX_PDF_BYTES, MIN_PDF_CHARS } from "./limits";

export type PdfExtract =
  | { ok: true; text: string; chars: number }
  | {
      ok: false;
      code: "too-large" | "not-pdf" | "encrypted" | "image-only" | "empty";
      message: string;
    };

function latin1(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => String.fromCharCode(b)).join("");
}

function unescapePdfString(raw: string): string {
  return raw
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\(\d{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}

function textFromOperators(content: string): string {
  const bits: string[] = [];
  const tj = /\((?:\\.|[^\\)])*\)\s*Tj/g;
  for (const m of content.matchAll(tj)) {
    const inner = m[0].replace(/\s*Tj$/, "").slice(1, -1);
    bits.push(unescapePdfString(inner));
  }
  const tjArr = /\[(.*?)\]\s*TJ/gs;
  for (const m of content.matchAll(tjArr)) {
    const inner = m[1] || "";
    for (const s of inner.matchAll(/\((?:\\.|[^\\)])*\)/g)) {
      bits.push(unescapePdfString(s[0].slice(1, -1)));
    }
  }
  return bits.join(" ").replace(/\s+/g, " ").trim();
}

function inflateStream(payload: Uint8Array): Uint8Array {
  try {
    return unzlibSync(payload);
  } catch {
    return inflateSync(payload);
  }
}

function streamBodies(bytes: Uint8Array): string[] {
  const raw = latin1(bytes);
  const bodies: string[] = [];
  const startRe = /<<([\s\S]*?)>>\s*stream\r?\n/g;
  let match: RegExpExecArray | null;
  while ((match = startRe.exec(raw))) {
    const dict = match[1] || "";
    const lengthMatch = /\/Length\s+(\d+)/.exec(dict);
    if (!lengthMatch) continue;
    const length = Number(lengthMatch[1]);
    const start = match.index + match[0].length;
    const payload = bytes.subarray(start, start + length);
    if (/FlateDecode/.test(dict)) {
      try {
        bodies.push(latin1(inflateStream(payload)));
      } catch {
        /* stream ilegível */
      }
    } else {
      bodies.push(latin1(payload));
    }
    startRe.lastIndex = start + length;
  }
  return bodies;
}

export function extractPdfText(bytes: Uint8Array): PdfExtract {
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
  const chunks = streamBodies(bytes).map(textFromOperators).filter(Boolean);
  const text = chunks.join(" ").replace(/\s+/g, " ").trim().slice(0, MAX_CV_CHARS);
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
}
