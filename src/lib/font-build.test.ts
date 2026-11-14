import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const layout = readFileSync(path.resolve(__dirname, "../app/layout.tsx"), "utf8");

describe("fontes locais do build", () => {
  it("não depende de download de Google Fonts durante o build", () => {
    expect(layout).not.toContain("next/font/google");
    expect(layout).toContain("@fontsource/atkinson-hyperlegible/latin-400.css");
    expect(layout).toContain("@fontsource/source-serif-4/latin-400.css");
    expect(layout).toContain("@fontsource/ibm-plex-mono/latin-400.css");
  });
});
