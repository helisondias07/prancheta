import { describe, expect, it } from "vitest";
import { matchCvToJob, tokenize } from "./match";

describe("matchCvToJob", () => {
  it("does not invent skills missing from the CV", () => {
    const r = matchCvToJob(
      "Trabalhei com React e TypeScript em lojas Nuvemshop.",
      "Buscamos React, TypeScript e Golang.",
    );
    expect(r.invented).toBe(false);
    expect(r.present).toContain("react");
    expect(r.present).toContain("typescript");
    expect(r.missing).toContain("golang");
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThan(100);
  });

  it("uses explicit requisitos lines", () => {
    const r = matchCvToJob("python scripts", "texto vago da empresa", ["Python", "Kubernetes"]);
    expect(r.present).toContain("python");
    expect(r.missing).toContain("kubernetes");
  });

  it("tokenizes next.js as nextjs", () => {
    expect(tokenize("Next.js e Node.js")).toEqual(expect.arrayContaining(["nextjs", "nodejs"]));
  });
});
