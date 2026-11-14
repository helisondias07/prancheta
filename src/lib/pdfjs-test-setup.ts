import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";

const require = createRequire(import.meta.url);
const pkg = path.dirname(require.resolve("pdfjs-dist/package.json"));

GlobalWorkerOptions.workerSrc = pathToFileURL(
  require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs"),
).href;

(globalThis as { __PRANCHETA_PDFJS__?: { cMapUrl: string; standardFontDataUrl: string } }).__PRANCHETA_PDFJS__ = {
  cMapUrl: pathToFileURL(path.join(pkg, "cmaps") + path.sep).href,
  standardFontDataUrl: pathToFileURL(path.join(pkg, "standard_fonts") + path.sep).href,
};
