import { describe, expect, it } from "vitest";
import { parseBackup, serializeBackup } from "./backup";
import { emptyStore } from "./types";

describe("compatibilidade do histórico local", () => {
  it("aceita histórico antigo e valida novos campos opcionais", () => {
    const store = emptyStore();
    store.applications.push({
      id: "a1", jobId: "j1", title: "Dev", company: "Exemplo", url: "https://example.test/job",
      status: "rascunho", appliedAt: null, notes: "", feedbackDueAt: null,
    });
    expect(parseBackup(serializeBackup(store)).ok).toBe(true);
    const raw = JSON.parse(serializeBackup(store));
    raw.applications[0].source = "unknown";
    expect(parseBackup(JSON.stringify(raw))).toMatchObject({ ok: false });
    raw.applications[0].source = "remotar";
    raw.applications[0].jobAddedAt = 123;
    expect(parseBackup(JSON.stringify(raw))).toMatchObject({ ok: false });
  });

  it("round-trips Lever source metadata in local backups", () => {
    const store = emptyStore();
    store.jobs.push({
      id: "j-lever", title: "Dev", company: "acme", url: "https://jobs.lever.co/acme/1",
      location: "Remoto", text: "React", source: "lever", addedAt: "2026-11-14T12:00:00.000Z",
    });
    store.applications.push({
      id: "a-lever", jobId: "j-lever", title: "Dev", company: "acme", url: "https://jobs.lever.co/acme/1",
      source: "lever", jobAddedAt: "2026-11-14T12:00:00.000Z", status: "rascunho", appliedAt: null,
      notes: "", feedbackDueAt: null,
    });
    expect(parseBackup(serializeBackup(store))).toMatchObject({ ok: true, store });
  });
});
