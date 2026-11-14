import { feedbackDueAt } from "./followup";
import type { Application } from "./types";

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

export function upsertApplication(
  apps: Application[],
  next: Omit<Application, "id"> & { id?: string },
): Application[] {
  const idx = findSameApplication(apps, next);
  if (idx < 0) {
    return [{ ...next, id: next.id ?? crypto.randomUUID() }, ...apps];
  }
  const prev = apps[idx];
  const merged: Application = {
    ...prev,
    ...next,
    id: prev.id,
    jobId: next.jobId || prev.jobId,
  };
  if (next.status === "candidatou") {
    merged.appliedAt = next.appliedAt || prev.appliedAt || new Date().toISOString();
    merged.feedbackDueAt = next.feedbackDueAt || feedbackDueAt(merged.appliedAt);
  }
  const copy = [...apps];
  copy[idx] = merged;
  return copy;
}

export function canRegister(title: string): string | null {
  if (!title.trim()) return "Escolha ou cole uma vaga antes de registrar no histórico.";
  return null;
}
