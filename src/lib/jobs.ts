import { safeExternalHttpUrl } from "./provenance";
import type { Job } from "./types";

export function importedJobUrlKey(raw: string): string | null {
  const safeUrl = safeExternalHttpUrl(raw);
  if (!safeUrl) return null;
  const url = new URL(safeUrl);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    const normalized = key.toLowerCase();
    if (normalized.startsWith("utm_") || ["fbclid", "gclid", "gh_src"].includes(normalized)) {
      url.searchParams.delete(key);
    }
  }
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  url.searchParams.sort();
  return url.href;
}

export function mergeImportedJobs(existing: Job[], incoming: Job[]): {
  jobs: Job[];
  added: number;
  duplicates: number;
} {
  const seen = new Set(existing.map((job) => importedJobUrlKey(job.url)).filter((key): key is string => Boolean(key)));
  const added: Job[] = [];
  let duplicates = 0;
  for (const job of incoming) {
    const key = importedJobUrlKey(job.url);
    if (key && seen.has(key)) {
      duplicates += 1;
      continue;
    }
    if (key) seen.add(key);
    added.push(job);
  }
  return { jobs: [...added, ...existing], added: added.length, duplicates };
}
