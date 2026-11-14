import { describe, expect, it } from "vitest";
import { mergeImportedJobs } from "./jobs";
import type { Job } from "./types";

function job(id: string, url: string, title = "Frontend"): Job {
  return {
    id,
    title,
    company: "Acme",
    url,
    location: "Remote",
    text: "React",
    source: "lever",
    addedAt: "2026-11-14T12:00:00.000Z",
  };
}

describe("importação sem duplicar vagas existentes", () => {
  it("ignora URLs iguais com tracking/hash e preserva o registro já salvo", () => {
    const saved = job("saved", "https://jobs.lever.co/acme/role?utm_source=feed#details");
    const result = mergeImportedJobs([saved], [
      job("duplicate", "https://jobs.lever.co/acme/role/?utm_medium=mail"),
      job("new", "https://jobs.lever.co/acme/another-role"),
    ]);
    expect(result).toMatchObject({ added: 1, duplicates: 1 });
    expect(result.jobs.map((item) => item.id)).toEqual(["new", "saved"]);
    expect(result.jobs[1]).toBe(saved);
  });

  it("deduplicates repeated items within one import but preserves distinct query IDs", () => {
    const result = mergeImportedJobs([], [
      job("one", "https://boards.greenhouse.io/acme/jobs/role?gh_jid=11&utm_campaign=x"),
      job("same", "https://boards.greenhouse.io/acme/jobs/role?utm_source=y&gh_jid=11#top"),
      job("distinct", "https://boards.greenhouse.io/acme/jobs/role?gh_jid=12"),
    ]);
    expect(result).toMatchObject({ added: 2, duplicates: 1 });
    expect(result.jobs.map((item) => item.id)).toEqual(["one", "distinct"]);
  });

  it("does not guess duplicates when a URL is missing", () => {
    const result = mergeImportedJobs([], [job("one", ""), job("two", "")]);
    expect(result).toMatchObject({ added: 2, duplicates: 0 });
  });
});
