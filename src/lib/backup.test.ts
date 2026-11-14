import { describe, expect, it } from "vitest";
import { emptyStore } from "./types";
import { MAX_BACKUP_BYTES, parseBackup, serializeBackup } from "./backup";

describe("backup local", () => {
  it("round-trips currículo, projetos, vagas e histórico sem alterar valores", () => {
    const store = emptyStore();
    store.profile.cvText = "Currículo fictício: React";
    store.profile.projects.push({ id: "p1", name: "Projeto", url: "https://example.test", whatIDid: "React", confirmedSkills: ["react"] });
    store.jobs.push({
      id: "j1", title: "Dev", company: "Exemplo", url: "https://example.test/job", location: "Remoto",
      text: "React", source: "manual", addedAt: "2026-11-14T12:00:00.000Z",
    });
    store.applications.push({
      id: "a1", jobId: "j1", title: "Dev", company: "Exemplo", url: "https://example.test/job",
      status: "candidatou", appliedAt: "2026-11-14T12:00:00.000Z", notes: "nota privada",
      feedbackDueAt: "2026-11-21T12:00:00.000Z",
    });

    const result = parseBackup(serializeBackup(store));
    expect(result).toEqual({ ok: true, store });
  });

  it("round-trips Ashby source provenance without treating the board slug as verified employer", () => {
    const store = emptyStore();
    store.jobs.push({
      id: "j-ashby", title: "Developer", company: "Acme", url: "https://jobs.ashbyhq.com/Acme/dev",
      location: "Remote", text: "TypeScript", source: "ashby", addedAt: "2026-11-14T12:00:00.000Z",
    });
    store.applications.push({
      id: "a-ashby", jobId: "j-ashby", title: "Developer", company: "Acme",
      url: "https://jobs.ashbyhq.com/Acme/dev", source: "ashby", jobAddedAt: "2026-11-14T12:00:00.000Z",
      status: "rascunho", appliedAt: null, notes: "", feedbackDueAt: null,
    });
    expect(parseBackup(serializeBackup(store))).toEqual({ ok: true, store });
  });

  it("recusa JSON inválido, versão incompatível e estruturas incompletas", () => {
    expect(parseBackup("{" ).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ version: 2 })).ok).toBe(false);
    const invalid = emptyStore() as unknown as Record<string, unknown>;
    invalid.profile = { cvText: "sem os demais campos" };
    expect(parseBackup(JSON.stringify(invalid))).toMatchObject({ ok: false });
  });

  it("rejects malformed confirmation data in local backups", () => {
    const store = emptyStore();
    store.profile.projects.push({ id: "p1", name: "Project", url: "", whatIDid: "React", confirmedSkills: ["react"] });
    const raw = JSON.parse(serializeBackup(store));
    raw.profile.projects[0].confirmedSkills = "react";
    expect(parseBackup(JSON.stringify(raw))).toMatchObject({ ok: false });
  });

  it("limita tamanho antes de interpretar e não retorna backup parcial", () => {
    const result = parseBackup("x".repeat(MAX_BACKUP_BYTES + 1));
    expect(result).toEqual({ ok: false, message: "O arquivo excede o limite de 5 MB." });
  });
});
