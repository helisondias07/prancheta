import { isFeedbackDue } from "./followup";
import { matchCvToJob, type MatchResult } from "./match";
import type { Application, ApplicationStatus, Store } from "./types";

export const KANBAN_COLUMNS: ApplicationStatus[] = [
  "rascunho",
  "candidatou",
  "aguardando",
  "feedback-pedido",
  "encerrada",
];

export type DashboardSnapshot = {
  hasCv: boolean;
  hasName: boolean;
  projectCount: number;
  jobCount: number;
  applicationCount: number;
  dueFollowups: Application[];
  byStatus: Record<ApplicationStatus, number>;
  latestMatch: MatchResult | null;
  gaps: string[];
};

export function emptyStatusCounts(): Record<ApplicationStatus, number> {
  return {
    rascunho: 0,
    candidatou: 0,
    aguardando: 0,
    "feedback-pedido": 0,
    encerrada: 0,
  };
}

export function groupByStatus(apps: Application[]): Record<ApplicationStatus, Application[]> {
  const groups: Record<ApplicationStatus, Application[]> = {
    rascunho: [],
    candidatou: [],
    aguardando: [],
    "feedback-pedido": [],
    encerrada: [],
  };
  for (const app of apps) {
    groups[app.status].push(app);
  }
  return groups;
}

export function dashboardSnapshot(store: Store, now = Date.now()): DashboardSnapshot {
  const byStatus = emptyStatusCounts();
  for (const app of store.applications) {
    byStatus[app.status] += 1;
  }
  const dueFollowups = store.applications.filter(
    (a) => a.status === "candidatou" && isFeedbackDue(a.appliedAt, now),
  );
  const gaps: string[] = [];
  if (!store.profile.cvText.trim()) gaps.push("Sem texto de currículo neste navegador.");
  if (!store.profile.projects.length && !store.profile.portfolioUrl.trim()) {
    gaps.push("Portfólio vazio — nada cadastrado, e não inventamos projeto.");
  }
  if (!store.jobs.length) {
    gaps.push("Nenhuma vaga guardada. Cole o anúncio ou importe Greenhouse/Remotar públicos.");
  }
  if (!store.applications.length) {
    gaps.push("Histórico vazio. Registrar é manual; esta app não se candidata.");
  }
  gaps.push("Fora deste recorte: PDF, login, e-mail automático, LinkedIn, cobrança e garantia de entrevista.");

  const latestJob = store.jobs[0];
  const latestMatch =
    latestJob && store.profile.cvText.trim()
      ? matchCvToJob(store.profile.cvText, latestJob.text)
      : null;

  return {
    hasCv: Boolean(store.profile.cvText.trim()),
    hasName: Boolean(store.profile.displayName.trim()),
    projectCount: store.profile.projects.length,
    jobCount: store.jobs.length,
    applicationCount: store.applications.length,
    dueFollowups,
    byStatus,
    latestMatch,
    gaps,
  };
}
