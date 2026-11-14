import { describe, expect, it } from "vitest";
import { applicationJobAddedLabel, applicationSourceLabel, jobProvenance, safeExternalHttpUrl } from "./provenance";

describe("origem dos registros", () => {
  it("distingue origem capturada de registro legado", () => {
    expect(applicationSourceLabel("greenhouse")).toBe("Quadro público Greenhouse");
    expect(applicationSourceLabel()).toBe("Origem não registrada neste histórico antigo");
  });
  it("distingue a inclusão da vaga da data em que a pessoa marcou candidatura", () => {
    expect(applicationJobAddedLabel("2026-11-14T15:00:00.000Z")).toBe("Vaga adicionada à sua lista em 14/11/2026");
    expect(applicationJobAddedLabel()).toBe("Data de inclusão da vaga não registrada");
  });
  it("expõe origem e data adicionada sem alegar validação independente", () => {
    expect(jobProvenance("greenhouse", "2026-11-14T15:00:00.000Z")).toBe("Quadro público Greenhouse · adicionada em 14/11/2026");
    expect(jobProvenance("manual", "invalida")).toBe("Informada manualmente · adicionada em data indisponível");
  });

  it("só torna clicáveis URLs HTTP(S) absolutas e sem credenciais", () => {
    expect(safeExternalHttpUrl(" https://example.com/job ")).toBe("https://example.com/job");
    expect(safeExternalHttpUrl("http://example.com/job")).toBe("http://example.com/job");
    expect(safeExternalHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalHttpUrl("data:text/html,hi")).toBeNull();
    expect(safeExternalHttpUrl("https://user:pass@example.com")).toBeNull();
    expect(safeExternalHttpUrl("/relative/path")).toBeNull();
    expect(safeExternalHttpUrl("http://127.0.0.1:3000/job")).toBe("http://127.0.0.1:3000/job");
    expect(safeExternalHttpUrl("https://10.0.0.8/job")).toBe("https://10.0.0.8/job");
  });
});
