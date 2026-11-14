import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.dirname(require.resolve("pdfjs-dist/package.json"));
const dest = path.join(process.cwd(), "public", "pdfjs");

fs.mkdirSync(dest, { recursive: true });
fs.copyFileSync(path.join(root, "build", "pdf.worker.min.mjs"), path.join(dest, "pdf.worker.min.mjs"));
fs.cpSync(path.join(root, "cmaps"), path.join(dest, "cmaps"), { recursive: true });
fs.cpSync(path.join(root, "standard_fonts"), path.join(dest, "standard_fonts"), { recursive: true });
console.log("pdfjs assets → public/pdfjs (worker + cmaps + standard_fonts, Apache-2.0)");
