export const MAX_IMPORT = 40;
export const PAGE_SIZE = 10;
export const MAX_TEXT = 4000;

export function capJobs<T>(jobs: T[]): { jobs: T[]; total: number; capped: boolean } {
  const total = jobs.length;
  return {
    jobs: jobs.slice(0, MAX_IMPORT),
    total,
    capped: total > MAX_IMPORT,
  };
}

export function clipText(text: string): string {
  if (text.length <= MAX_TEXT) return text;
  return `${text.slice(0, MAX_TEXT)}…`;
}
