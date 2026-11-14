export const MAX_IMPORT = 40;
export const PAGE_SIZE = 10;
export const MAX_TEXT = 4000;
/** Teto do arquivo PDF no navegador (não sobe ao servidor). */
export const MAX_PDF_BYTES = 2 * 1024 * 1024;
export const MIN_PDF_CHARS = 20;
export const MAX_CV_CHARS = 20_000;

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
