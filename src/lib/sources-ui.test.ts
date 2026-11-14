import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(path.resolve(__dirname, "../app/vagas/vagas-client.tsx"), "utf8");
const chrome = readFileSync(path.resolve(__dirname, "../app/chrome.tsx"), "utf8");

describe("feedback da importação de vagas", () => {
  it("anuncia todos os erros e diferencia sucesso e falha por estado", () => {
    expect(source).toContain('role={fonteError ? "alert" : "status"}');
    expect(source).toContain('className={fonteError ? "error-summary bad" : "muted"}');
    expect(source.match(/setFonteError\(true\);/g)).toHaveLength(3);
    expect(source.match(/setFonteError\(false\);/g)).toHaveLength(2);
    expect(source).toContain('setFonteMsg(data.error ?? "Não foi possível importar.");');
    expect(source).toContain('setFonteMsg("Falha de rede. Tente de novo ou cole o anúncio.");');
  });

  it("explica que deduplicação exige link", () => {
    expect(source).toContain("Vagas com o mesmo link não duplicam; sem link podem se repetir.");
  });

  it("explica a limitação da importação Ashby", () => {
    expect(source).toContain("Só importamos anúncios com isListed=true");
    expect(source).toContain("o slug é rótulo do quadro, não nome confirmado da empresa.");
    expect(source).toContain("O direito de redistribuir vagas em agregador comercial não foi confirmado");
    expect(source).toContain("não use essa importação em operação comercial até validar os termos.");
    expect(chrome).toContain("Greenhouse, Remotar, Lever e Ashby");
  });

  it("associa label e aviso comercial Ashby ao campo de fonte", () => {
    expect(source).toContain('<label htmlFor="fonte">');
    expect(source).toContain('id="fonte"');
    expect(source).toContain('aria-describedby="fonte-ashby-rights"');
    expect(source).toContain('id="fonte-ashby-rights"');
  });
});
