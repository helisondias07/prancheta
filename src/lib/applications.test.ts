import { describe, expect, it } from "vitest";
import { canRegister, filterApplications, removeApplication, setApplicationStatus, upsertApplication } from "./applications";
import { dashboardSnapshot } from "./dashboard";
import { isFeedbackDue } from "./followup";
import { emptyStore, type Application } from "./types";

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
  it("preserva nota, origem, dados da vaga e datas quando um rascunho é registrado de novo", () => {
    const addedAt = "2026-10-01T12:00:00.000Z";
    const appliedAt = "2026-10-08T12:00:00.000Z";
    const existing = base({
      source: "remotar", jobAddedAt: addedAt, notes: "nota privada", company: "Empresa antiga",
      url: "https://example.com/vaga", status: "candidatou", appliedAt,
      feedbackDueAt: "2026-10-15T12:00:00.000Z",
    });
    const updated = upsertApplication([existing], {
      jobId: "job-1", title: "Frontend", company: "", url: "", source: "manual",
      status: "rascunho", appliedAt: null, notes: "", feedbackDueAt: null,
    }, "2026-11-14T15:00:00.000Z");
    expect(updated).toHaveLength(1);
    expect(updated[0]).toMatchObject({
      notes: "nota privada", source: "remotar", jobAddedAt: addedAt,
      company: "Empresa antiga", url: "https://example.com/vaga", appliedAt,
      feedbackDueAt: "2026-10-15T12:00:00.000Z", status: "rascunho",
    });
  });

  it("preserva notas e datas de um histórico legado sem origem", () => {
    const original = base({ jobId: "", source: undefined, jobAddedAt: undefined, notes: "nota legada" });
    const updated = upsertApplication([original], {
      jobId: "", title: original.title, company: original.company, url: original.url,
      status: "aguardando", appliedAt: null, notes: "", feedbackDueAt: null,
    });
    expect(updated[0].notes).toBe("nota legada");
    expect(updated[0].source).toBeUndefined();
  });

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

  it("keeps the first appliedAt if the user marks the same job again", () => {
    const first = upsertApplication(
      [base({})],
      {
        jobId: "job-1",
        title: "Frontend",
        company: "Acme",
        url: "https://example.com/vaga",
        status: "candidatou",
        appliedAt: "2026-11-01T12:00:00.000Z",
        notes: "",
        feedbackDueAt: "2026-11-08T12:00:00.000Z",
      },
      "2026-11-14T15:00:00.000Z",
    );
    const again = upsertApplication(
      first,
      {
        jobId: "job-1",
        title: "Frontend",
        company: "Acme",
        url: "https://example.com/vaga",
        status: "candidatou",
        appliedAt: "2026-11-14T15:00:00.000Z",
        notes: "",
        feedbackDueAt: "2026-11-21T15:00:00.000Z",
      },
      "2026-11-14T15:00:00.000Z",
    );
    expect(again).toHaveLength(1);
    expect(again[0].appliedAt).toBe("2026-11-01T12:00:00.000Z");
    expect(again[0].feedbackDueAt).toBe("2026-11-08T12:00:00.000Z");
  });
});

describe("setApplicationStatus", () => {
  const t0 = "2026-11-14T15:00:00.000Z";
  const due = "2026-11-21T15:00:00.000Z";

  it("grava appliedAt e começa o D+7 ao mover o Kanban para candidatou", () => {
    const moved = setApplicationStatus([base({})], "a", "candidatou", t0);
    expect(moved).toHaveLength(1);
    expect(moved[0].status).toBe("candidatou");
    expect(moved[0].appliedAt).toBe(t0);
    expect(moved[0].feedbackDueAt).toBe(due);
    expect(isFeedbackDue(moved[0].appliedAt, Date.parse("2026-11-21T14:59:59.000Z"))).toBe(false);
    expect(isFeedbackDue(moved[0].appliedAt, Date.parse(due))).toBe(true);
    const store = emptyStore();
    store.applications = moved;
    expect(dashboardSnapshot(store, Date.parse(due)).dueFollowups).toHaveLength(1);
    expect(dashboardSnapshot(store, Date.parse(t0)).dueFollowups).toHaveLength(0);
  });

  it("preserva a data original e não cria outra linha", () => {
    const original = "2026-11-01T12:00:00.000Z";
    const first = setApplicationStatus(
      [base({ appliedAt: original, feedbackDueAt: "2026-11-08T12:00:00.000Z" })],
      "a",
      "candidatou",
      t0,
    );
    const parked = setApplicationStatus(first, "a", "aguardando", "2026-11-16T12:00:00.000Z");
    const back = setApplicationStatus(parked, "a", "candidatou", "2026-11-17T12:00:00.000Z");
    expect(back).toHaveLength(1);
    expect(back[0].id).toBe("a");
    expect(parked[0].appliedAt).toBe(original);
    expect(back[0].appliedAt).toBe(original);
    expect(back[0].feedbackDueAt).toBe("2026-11-08T12:00:00.000Z");
  });
});

describe("removeApplication", () => {
  it("removes only the selected record without mutating the source", () => {
    const first = base({ id: "remove-me", notes: "nota privada" });
    const second = base({ id: "keep-me", jobId: "job-2", title: "Outra vaga" });
    const applications = [first, second];

    const remaining = removeApplication(applications, "remove-me");

    expect(remaining).toEqual([second]);
    expect(remaining).not.toBe(applications);
    expect(applications).toEqual([first, second]);
    expect(removeApplication(applications, "missing-id")).toEqual(applications);
  });
});

describe("filterApplications", () => {
  it("searches only title, company and status, ignoring accents and case", () => {
    const first = base({ id: "first", title: "Analista de dados", company: "São João", status: "aguardando", notes: "segredo" });
    const second = base({ id: "second", title: "Designer", company: "Outra", status: "rascunho" });
    expect(filterApplications([first, second], "SAO JOAO")).toEqual([first]);
    expect(filterApplications([first, second], "AGUARDANDO")).toEqual([first]);
    expect(filterApplications([first, second], "segredo")).toEqual([]);
  });

  it("returns every record for an empty query and none for an unmatched query", () => {
    const apps = [base({ id: "one" }), base({ id: "two", jobId: "job-2" })];
    expect(filterApplications(apps, "  ")).toBe(apps);
    expect(filterApplications(apps, "não existe")).toEqual([]);
  });
});
