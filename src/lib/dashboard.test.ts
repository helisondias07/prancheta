import { describe, expect, it } from "vitest";
import { dashboardSnapshot, groupByStatus } from "./dashboard";
import { emptyStore } from "./types";

describe("dashboardSnapshot", () => {
  it("lista lacunas honestas quando o caderno está vazio", () => {
    const snap = dashboardSnapshot(emptyStore());
    expect(snap.hasCv).toBe(false);
    expect(snap.jobCount).toBe(0);
    expect(snap.gaps.some((g) => /currículo/i.test(g))).toBe(true);
    expect(snap.gaps.some((g) => /LinkedIn/.test(g))).toBe(true);
    expect(snap.latestMatch).toBeNull();
  });

  it("conta D+7 e agrupa o Kanban sem inventar envio", () => {
    const store = emptyStore();
    store.profile.cvText = "React TypeScript";
    store.jobs.push({
      id: "j1",
      title: "Frontend",
      company: "Exemplo",
      url: "https://example.com/vaga",
      location: "",
      text: "React e Golang",
      source: "manual",
      addedAt: new Date().toISOString(),
    });
    store.applications.push(
      {
        id: "a1",
        jobId: "j1",
        title: "Frontend",
        company: "Exemplo",
        url: "https://example.com/vaga",
        status: "candidatou",
        appliedAt: new Date(Date.now() - 8 * 86_400_000).toISOString(),
        notes: "",
        feedbackDueAt: null,
      },
      {
        id: "a2",
        jobId: "j1",
        title: "Frontend",
        company: "Exemplo",
        url: "https://example.com/vaga",
        status: "rascunho",
        appliedAt: null,
        notes: "",
        feedbackDueAt: null,
      },
    );
    const snap = dashboardSnapshot(store);
    expect(snap.dueFollowups).toHaveLength(1);
    expect(snap.byStatus.candidatou).toBe(1);
    expect(snap.byStatus.rascunho).toBe(1);
    expect(snap.latestMatch?.present).toContain("react");
    expect(snap.latestMatch?.invented).toBe(false);
    expect(snap.latestMatch?.ats).toBe(false);
    const board = groupByStatus(store.applications);
    expect(board.rascunho).toHaveLength(1);
    expect(board.candidatou).toHaveLength(1);
  });
});
