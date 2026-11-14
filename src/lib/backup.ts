import type { Application, Job, Profile, Project, Store } from "./types";

export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

export type BackupResult = { ok: true; store: Store } | { ok: false; message: string };

const STATUSES = new Set(["rascunho", "candidatou", "aguardando", "feedback-pedido", "encerrada"]);
const SOURCES = new Set(["manual", "greenhouse", "remotar"]);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function strings(value: unknown, fields: string[]): value is Record<string, unknown> {
  return record(value) && fields.every((field) => typeof value[field] === "string");
}

function isProject(value: unknown): value is Project {
  return (
    strings(value, ["id", "name", "url", "whatIDid"]) &&
    (!Object.prototype.hasOwnProperty.call(value, "confirmedSkills") ||
      (Array.isArray(value.confirmedSkills) && value.confirmedSkills.every((skill) => typeof skill === "string")))
  );
}

function isProfile(value: unknown): value is Profile {
  return (
    strings(value, ["displayName", "headline", "cvText", "portfolioUrl"]) &&
    Array.isArray(value.projects) &&
    value.projects.every(isProject)
  );
}

function isJob(value: unknown): value is Job {
  return (
    strings(value, ["id", "title", "company", "url", "location", "text", "addedAt"]) &&
    record(value) &&
    typeof value.source === "string" &&
    SOURCES.has(value.source)
  );
}

function isApplication(value: unknown): value is Application {
  return (
    strings(value, ["id", "jobId", "title", "company", "url", "notes"]) &&
    record(value) &&
    typeof value.status === "string" &&
    STATUSES.has(value.status) &&
    (!Object.prototype.hasOwnProperty.call(value, "source") ||
      (typeof value.source === "string" && SOURCES.has(value.source))) &&
    (!Object.prototype.hasOwnProperty.call(value, "jobAddedAt") || typeof value.jobAddedAt === "string") &&
    (value.appliedAt === null || typeof value.appliedAt === "string") &&
    (value.feedbackDueAt === null || typeof value.feedbackDueAt === "string")
  );
}

export function parseBackup(text: string): BackupResult {
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) {
    return { ok: false, message: "O arquivo excede o limite de 5 MB." };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, message: "O arquivo não é um JSON válido." };
  }
  if (
    !record(raw) ||
    raw.version !== 1 ||
    !isProfile(raw.profile) ||
    !Array.isArray(raw.jobs) ||
    !raw.jobs.every(isJob) ||
    !Array.isArray(raw.applications) ||
    !raw.applications.every(isApplication)
  ) {
    return { ok: false, message: "Formato de backup não reconhecido. Seus dados atuais não foram alterados." };
  }
  return { ok: true, store: raw as Store };
}

export function serializeBackup(store: Store): string {
  return `${JSON.stringify(store, null, 2)}\n`;
}
