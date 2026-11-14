const DAY = 86_400_000;

export function feedbackDueAt(appliedAtIso: string): string {
  return new Date(Date.parse(appliedAtIso) + 7 * DAY).toISOString();
}

export function isFeedbackDue(appliedAtIso: string | null, now = Date.now()): boolean {
  if (!appliedAtIso) return false;
  const t = Date.parse(appliedAtIso);
  return Number.isFinite(t) && now - t >= 7 * DAY;
}
