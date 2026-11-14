import type { ApplicationStatus } from "./types";

export function stampLabel(status: ApplicationStatus, due: boolean): string {
  if (due && status === "candidatou") return "D+7";
  if (status === "candidatou") return "enviada";
  if (status === "aguardando") return "silêncio";
  if (status === "feedback-pedido") return "follow-up";
  if (status === "encerrada") return "encerrada";
  return "rascunho";
}

export function stampClass(status: ApplicationStatus, due: boolean): string {
  if (due && status === "candidatou") return "stamp-d7";
  if (status === "candidatou") return "stamp-enviada";
  if (status === "encerrada") return "stamp-encerrada";
  if (status === "aguardando") return "stamp-incerto";
  return "stamp-rascunho";
}
