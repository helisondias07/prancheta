import { describe, expect, it } from "vitest";
import { canRegister, upsertApplication } from "./applications";
import type { Application } from "./types";

const base = (partial: Partial<Application>): Application => ({
  id: "a",
  jobId: "job-1",
  title: "Frontend",
  company: "Acme",
  url: "https://example.com/vaga",
  status: "rascunho",
  appliedAt: null,
  notes: "",
  feedbackDueAt: null,
  ...partial,
});

describe("upsertApplication", () => {
  it("updates the same job instead of duplicating draft and sent", () => {
    const first = upsertApplication([], {
      jobId: "job-1",
      title: "Frontend",
      company: "Acme",
      url: "https://example.com/vaga",
      status: "rascunho",
      appliedAt: null,
      notes: "",
      feedbackDueAt: null,
    });
    expect(first).toHaveLength(1);
    const second = upsertApplication(first, {
      jobId: "job-1",
      title: "Frontend",
      company: "Acme",
      url: "https://example.com/vaga",
      status: "candidatou",
      appliedAt: "2026-11-14T12:00:00.000Z",
      notes: "",
      feedbackDueAt: "2026-11-21T12:00:00.000Z",
    });
    expect(second).toHaveLength(1);
    expect(second[0].status).toBe("candidatou");
    expect(second[0].id).toBe(first[0].id);
  });

  it("keeps a different job as a second row", () => {
    const apps = upsertApplication([base({})], {
      jobId: "job-2",
      title: "Outra",
      company: "Beta",
      url: "https://example.com/outra",
      status: "rascunho",
      appliedAt: null,
      notes: "",
      feedbackDueAt: null,
    });
    expect(apps).toHaveLength(2);
  });

  it("rejects an empty title", () => {
    expect(canRegister("  ")).toMatch(/vaga/);
    expect(canRegister("Frontend")).toBeNull();
  });
});
