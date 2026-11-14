import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { MAX_PDF_BYTES } from "./limits";
import { extractPdfText } from "./pdf-extract";

function pdfWrapper(contentStream: string, extra = ""): Uint8Array {
  const body = `BT /F1 12 Tf 72 700 Td ${contentStream} ET`;
  const objects = `%PDF-1.1
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj
4 0 obj<< /Length ${body.length} >>stream
${body}
endstream
endobj
5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj
${extra}
%%EOF`;
  return new Uint8Array(Buffer.from(objects, "latin1"));
}

describe("extractPdfText", () => {
  it("lê texto visível de um PDF simples", () => {
    const out = extractPdfText(pdfWrapper("(React TypeScript Vitest) Tj"));
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.text).toMatch(/React TypeScript Vitest/);
  });

  it("recusa PDF grande, sem cabeçalho, criptografado e imagem", () => {
    const huge = new Uint8Array(MAX_PDF_BYTES + 1);
    huge.set(Buffer.from("%PDF-"));
    expect(extractPdfText(huge).ok).toBe(false);
    if (extractPdfText(huge).ok) return;
    expect(extractPdfText(huge).code).toBe("too-large");
    expect(extractPdfText(new Uint8Array([1, 2, 3])).ok).toBe(false);
    const locked = pdfWrapper("(secret) Tj", "6 0 obj<< /Encrypt 7 0 R >>endobj");
    const enc = extractPdfText(locked);
    expect(enc.ok).toBe(false);
    if (enc.ok) return;
    expect(enc.code).toBe("encrypted");
    const image = extractPdfText(pdfWrapper(""));
    expect(image.ok).toBe(false);
    if (image.ok) return;
    expect(image.code === "image-only" || image.code === "empty").toBe(true);
  });

  it("infla stream FlateDecode e não inventa texto", () => {
    const inner = Buffer.from("BT /F1 12 Tf 72 700 Td (React TypeScript Vitest Golang) Tj ET", "latin1");
    const packed = deflateSync(inner);
    const header = Buffer.from(
      `%PDF-1.1
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>endobj
4 0 obj<< /Length ${packed.length} /Filter /FlateDecode >>stream\n`,
      "latin1",
    );
    const footer = Buffer.from("\nendstream\nendobj\n%%EOF", "latin1");
    const out = extractPdfText(new Uint8Array(Buffer.concat([header, packed, footer])));
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.text).toMatch(/Golang/);
    expect(out.text).not.toMatch(/inventado/);
  });
});
