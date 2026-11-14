import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(path.resolve(__dirname, "../app/historico/historico-client.tsx"), "utf8");

describe("interface do histórico de candidaturas", () => {
  it("expõe anúncio identificado e nota editável com privacidade explícita", () => {
    expect(source).toContain("applicationSourceLabel(a.source)");
    expect(source).toContain("applicationJobAddedLabel(a.jobAddedAt)");
    expect(source).toContain("draftFollowUpMessage({ jobTitle: a.title, company: a.company })");
    expect(source).toContain("Copiar rascunho");
    expect(source).toContain("Rascunho copiado; envio continua manual.");
    expect(source).toContain("Você marcou que se candidatou em");
    expect(source).toContain("Abrir anúncio informado");
    expect(source).toContain("não verificado nem acessado pela Prancheta");
    expect(source).toContain("endereço interno");
    expect(source).toContain("rel=\"noopener noreferrer\"");
    expect(source).toContain("removeApplication(s.applications, a.id)");
    expect(source).toContain("aria-expanded={removePromptId === a.id}");
    expect(source).toContain("role=\"status\" aria-live=\"polite\"");
    expect(source).toContain("filterApplications(store.applications, historyQuery)");
    expect(source).toContain("Filtrar por vaga, empresa ou status");
    expect(source).toContain("Nenhuma candidatura corresponde");
    expect(source).toContain("Nota privada sobre esta candidatura");
    expect(source).toContain("Salvo automaticamente só neste aparelho");
  });
});
