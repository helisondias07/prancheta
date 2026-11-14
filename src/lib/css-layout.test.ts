import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.resolve(__dirname, "../app/globals.css"), "utf8").replace(/\r\n/g, "\n");
const vagas = readFileSync(path.resolve(__dirname, "../app/vagas/vagas-client.tsx"), "utf8").replace(
  /\r\n/g,
  "\n",
);

describe("botão de candidatura em 375px", () => {
  it("quebra o grupo .actions e o texto do botão em vez de cortar", () => {
    expect(css).toContain(".actions {\n  display: flex;\n  flex-wrap: wrap;");
    expect(css).toContain(".actions button {\n  margin: 0.4rem 0 0;\n  flex: 1 1 16rem;");
    expect(css).toContain("max-width: 100%;\n  white-space: normal;\n  overflow-wrap: anywhere;");
    expect(vagas).toContain('className="actions"');
    expect(vagas).toContain("Marquei que me candidatei (fora daqui)");
    const inner = 375 - 1.25 * 16 * 2 - 1.1 * 16 * 2;
    expect(inner).toBeGreaterThan(250);
    expect(inner).toBeLessThan(512);
  });
});
