import { describe, expect, it } from "vitest";
import { draftFollowUpMessage } from "./draft";

describe("draftFollowUpMessage", () => {
  it("uses only the supplied vacancy and company, and never claims delivery", () => {
    const draft = draftFollowUpMessage({ jobTitle: "Analista", company: "" });
    expect(draft.sent).toBe(false);
    expect(draft.body).toContain("vaga de Analista");
    expect(draft.body).toContain("Não foi enviado");
    expect(draft.body).not.toMatch(/@|https?:\/\//);
  });

  it("includes the supplied company but no invented contact", () => {
    const draft = draftFollowUpMessage({ jobTitle: "Frontend", company: "Empresa Exemplo" });
    expect(draft.body).toContain("vaga de Frontend na Empresa Exemplo");
    expect(draft.body).not.toContain("recrutador");
  });
});
