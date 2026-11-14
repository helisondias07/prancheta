import { describe, expect, it } from "vitest";
import { jobProvenance, safeExternalHttpUrl } from "./provenance";

describe("origem dos registros", () => {
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
  });
});
