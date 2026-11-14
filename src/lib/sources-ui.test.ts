import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(path.resolve(__dirname, "../app/vagas/vagas-client.tsx"), "utf8");

describe("feedback da importação de vagas", () => {
  it("anuncia todos os erros e diferencia sucesso e falha por estado", () => {
    expect(source).toContain('role={fonteError ? "alert" : "status"}');
    expect(source).toContain('className={fonteError ? "error-summary bad" : "muted"}');
    expect(source.match(/setFonteError\(true\);/g)).toHaveLength(3);
    expect(source.match(/setFonteError\(false\);/g)).toHaveLength(2);
    expect(source).toContain('setFonteMsg(data.error ?? "Não foi possível importar.");');
    expect(source).toContain('setFonteMsg("Falha de rede. Tente de novo ou cole o anúncio.");');
  });
});
