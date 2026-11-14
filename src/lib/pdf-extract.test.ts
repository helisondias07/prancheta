import { readFileSync } from "node:fs";
import path from "node:path";
import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { MAX_PDF_BYTES } from "./limits";
import { extractPdfText } from "./pdf-extract";

const fixtures = path.join(__dirname, "fixtures");

function assemblePdf(objectBodies: Array<string | Uint8Array>): Uint8Array {
  const chunks: Buffer[] = [Buffer.from("%PDF-1.4\n", "latin1")];
  const offsets: number[] = [0];
  let pos = chunks[0].length;
  objectBodies.forEach((body, i) => {
    offsets.push(pos);
    const inner = typeof body === "string" ? Buffer.from(body, "latin1") : Buffer.from(body);
    const obj = Buffer.concat([
      Buffer.from(`${i + 1} 0 obj\n`, "latin1"),
      inner,
      Buffer.from("\nendobj\n", "latin1"),
    ]);
    chunks.push(obj);
    pos += obj.length;
  });
  const startxref = pos;
  let xref = `xref\n0 ${objectBodies.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objectBodies.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objectBodies.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;
  chunks.push(Buffer.from(xref, "latin1"));
  return new Uint8Array(Buffer.concat(chunks));
}

function contentStream(payload: Uint8Array | string, filter?: string): Buffer {
  const data = typeof payload === "string" ? Buffer.from(payload, "latin1") : Buffer.from(payload);
  const dict = filter
    ? `<< /Length ${data.length} /Filter ${filter} >>`
    : `<< /Length ${data.length} >>`;
  return Buffer.concat([
    Buffer.from(`${dict}\nstream\n`, "latin1"),
    data,
    Buffer.from("\nendstream", "latin1"),
  ]);
}

function helveticaPdf(operators: string, extra: Array<string | Uint8Array> = []): Uint8Array {
  const body = `BT /F1 12 Tf 72 700 Td ${operators} ET`;
  return assemblePdf([
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    contentStream(body),
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ...extra,
  ]);
}

function cidHexPdf(): Uint8Array {
  const toUnicode = `/CIDInit /ProcSet findresource begin
12 dict begin
begincmap
/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def
/CMapName /Adobe-Identity-UCS def
/CMapType 2 def
1 begincodespacerange
<0000> <FFFF>
endcodespacerange
6 beginbfchar
<0047> <0047>
<0061> <0061>
<006C> <006C>
<006E> <006E>
<006F> <006F>
<0067> <0067>
endbfchar
endcmap
CMapName currentdict /CMap defineresource pop
end
end`;
  const body = "BT /F0 12 Tf 72 720 Td (React TypeScript Vitest ) Tj T* <0047006F006C0061006E0067> Tj ET";
  return assemblePdf([
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F0 5 0 R >> >> >>",
    contentStream(body),
    "<< /Type /Font /Subtype /Type0 /BaseFont /Dummy /Encoding /Identity-H /DescendantFonts [6 0 R] /ToUnicode 8 0 R >>",
    "<< /Type /Font /Subtype /CIDFontType2 /BaseFont /Dummy /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor 7 0 R /W [0 1 500] /CIDToGIDMap /Identity >>",
    "<< /Type /FontDescriptor /FontName /Dummy /Flags 4 /FontBBox [0 0 500 700] /ItalicAngle 0 /Ascent 700 /Descent -200 /CapHeight 700 /StemV 80 >>",
    contentStream(toUnicode),
  ]);
}

describe("extractPdfText", () => {
  it("lê texto visível de um PDF simples", async () => {
    const out = await extractPdfText(helveticaPdf("(React TypeScript Vitest) Tj"));
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.text).toMatch(/React TypeScript Vitest/);
  });

  it("lê parênteses escapados", async () => {
    const out = await extractPdfText(helveticaPdf("(React \\(TypeScript\\) Vitest Golang) Tj"));
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.text).toMatch(/TypeScript/);
    expect(out.text).toMatch(/Golang/);
  });

  it("lê ASCII85+Flate ReportLab (texto fictício) com parênteses", async () => {
    const bytes = new Uint8Array(readFileSync(path.join(fixtures, "cv-reportlab-ascii85.pdf")));
    const out = await extractPdfText(bytes);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.text).toMatch(/Golang/);
    expect(out.text).toMatch(/exemplo/);
  });

  it("lê hex ASCII e não omite a palavra só em hex", async () => {
    const out = await extractPdfText(helveticaPdf("(React TypeScript Vitest ) Tj <476F6C616E67> Tj"));
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.text).toMatch(/Golang/);
  });

  it("CID hex: extrai Golang ou recusa incompleto — nunca sucesso sem Golang", async () => {
    const out = await extractPdfText(cidHexPdf());
    if (out.ok) {
      expect(out.text).toMatch(/Golang/);
      expect(out.text).toMatch(/React TypeScript Vitest/);
    } else {
      expect(["incomplete", "image-only", "empty"]).toContain(out.code);
    }
  });

  it("recusa PDF grande, sem cabeçalho, criptografado e scan", async () => {
    const huge = new Uint8Array(MAX_PDF_BYTES + 1);
    huge.set(Buffer.from("%PDF-"));
    const tooBig = await extractPdfText(huge);
    expect(tooBig.ok).toBe(false);
    if (tooBig.ok) return;
    expect(tooBig.code).toBe("too-large");
    expect((await extractPdfText(new Uint8Array([1, 2, 3]))).ok).toBe(false);
    const locked = new Uint8Array(readFileSync(path.join(fixtures, "cv-encrypted.pdf")));
    const enc = await extractPdfText(locked);
    expect(enc.ok).toBe(false);
    if (enc.ok) return;
    expect(enc.code).toBe("encrypted");
    const image = await extractPdfText(new Uint8Array(readFileSync(path.join(fixtures, "cv-scan.pdf"))));
    expect(image.ok).toBe(false);
    if (image.ok) return;
    expect(image.code === "image-only" || image.code === "empty").toBe(true);
  });

  it("infla stream FlateDecode e não inventa texto", async () => {
    const inner = Buffer.from("BT /F1 12 Tf 72 700 Td (React TypeScript Vitest Golang) Tj ET", "latin1");
    const packed = deflateSync(inner);
    const out = await extractPdfText(
      assemblePdf([
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        contentStream(packed, "/FlateDecode"),
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
      ]),
    );
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.text).toMatch(/Golang/);
    expect(out.text).not.toMatch(/inventado/);
  });
});
