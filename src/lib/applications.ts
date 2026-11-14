import { feedbackDueAt } from "./followup";
import type { Application, ApplicationStatus } from "./types";

export function findSameApplication(
  apps: Application[],
  input: { jobId?: string; url?: string; title?: string; company?: string },
): number {
  return apps.findIndex((a) => {
    if (input.jobId && a.jobId && a.jobId === input.jobId) return true;
    if (input.url && a.url && a.url === input.url) return true;
    return Boolean(
      !input.jobId &&
        !a.jobId &&
        input.title &&
        a.title === input.title &&
        (input.company || "") === (a.company || ""),
    );
  });
}

function stampCandidatura(app: Application, now: string): Application {
  if (app.status !== "candidatou") return app;
  const appliedAt = app.appliedAt || now;
  return {
    ...app,
    appliedAt,
    feedbackDueAt: app.feedbackDueAt || feedbackDueAt(appliedAt),
  };
}

export function setApplicationStatus(
  apps: Application[],
  id: string,
  status: ApplicationStatus,
  now = new Date().toISOString(),
): Application[] {
  return apps.map((app) => {
    if (app.id !== id) return app;
    return stampCandidatura({ ...app, status }, now);
  });
}

export function removeApplication(apps: Application[], id: string): Application[] {
  return apps.filter((app) => app.id !== id);
}

function normalizeApplicationQuery(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR").trim();
}

export function filterApplications(apps: Application[], query: string): Application[] {
  const normalizedQuery = normalizeApplicationQuery(query);
  if (!normalizedQuery) return apps;
  return apps.filter((app) => normalizeApplicationQuery(`${app.title} ${app.company} ${app.status}`).includes(normalizedQuery));
}

export function upsertApplication(
  apps: Application[],
  next: Omit<Application, "id"> & { id?: string },
  now = new Date().toISOString(),
): Application[] {
  const idx = findSameApplication(apps, next);
  if (idx < 0) {
    const created: Application = stampCandidatura(
      { ...next, id: next.id ?? crypto.randomUUID() },
      now,
    );
    return [created, ...apps];
  }
  const prev = apps[idx];
  const merged = stampCandidatura(
    {
      ...prev,
      ...next,
      id: prev.id,
      jobId: next.jobId || prev.jobId,
      title: next.title.trim() ? next.title : prev.title,
      company: next.company.trim() ? next.company : prev.company,
      url: next.url.trim() ? next.url : prev.url,
      source: prev.source || next.source,
      jobAddedAt: prev.jobAddedAt || next.jobAddedAt,
      notes: prev.notes || next.notes,
      appliedAt: prev.appliedAt || next.appliedAt,
      feedbackDueAt: prev.feedbackDueAt || next.feedbackDueAt,
    },
    now,
  );
  const copy = [...apps];
  copy[idx] = merged;
  return copy;
}

export function canRegister(title: string): string | null {
  if (!title.trim()) return "Escolha ou cole uma vaga antes de registrar no histórico.";
  return null;
}
