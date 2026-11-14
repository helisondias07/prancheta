import type { JobSource } from "./types";

const JOB_SOURCE_LABEL: Record<JobSource, string> = {
  manual: "Informada manualmente",
  greenhouse: "Quadro público Greenhouse",
  remotar: "Remotar",
};

export function safeExternalHttpUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function jobProvenance(source: JobSource, addedAt: string): string {
  const timestamp = Date.parse(addedAt);
  const date = Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(timestamp)
    : "data indisponível";
  return `${JOB_SOURCE_LABEL[source]} · adicionada em ${date}`;
}

export function applicationSourceLabel(source?: JobSource): string {
  if (!source) return "Origem não registrada neste histórico antigo";
  return JOB_SOURCE_LABEL[source];
}

export function applicationJobAddedLabel(addedAt?: string): string {
  if (!addedAt) return "Data de inclusão da vaga não registrada";
  const timestamp = Date.parse(addedAt);
  const date = Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(timestamp)
    : "data indisponível";
  return `Vaga adicionada à sua lista em ${date}`;
}
