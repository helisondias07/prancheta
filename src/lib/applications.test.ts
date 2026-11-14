import { describe, expect, it } from "vitest";
import { canRegister, setApplicationStatus, upsertApplication } from "./applications";
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
