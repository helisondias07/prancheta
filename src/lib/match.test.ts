import { describe, expect, it } from "vitest";
import { analyzeEvidence, matchCvToJob, tokenize } from "./match";

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

  it("separa evidência do portfólio sem inventar no CV nem chamar ATS", () => {
    const r = analyzeEvidence(
      "Trabalhei com React e TypeScript.",
      "Buscamos React, TypeScript e Golang.",
      [],
      { projects: [{ name: "API", url: "https://example.com/api", whatIDid: "serviço em Golang" }] },
    );
    expect(r.ats).toBe(false);
    expect(r.invented).toBe(false);
    expect(r.present).toContain("react");
    expect(r.present).not.toContain("golang");
    expect(r.onlyInPortfolio).toContain("golang");
    expect(r.missingEverywhere).not.toContain("golang");
    expect(r.coverage.cv).toBe(r.present.length);
    expect(r.portfolioSources.golang).toEqual(["API"]);
  });

  it("does not count portfolio URLs as skill evidence", () => {
    const r = analyzeEvidence("", "React and TypeScript", [], {
      portfolioUrl: "https://example.com/react-typescript",
      projects: [{ id: "1", name: "Projeto", url: "https://example.com/react", whatIDid: "" }],
    });
    expect(r.inPortfolio).toEqual([]);
    expect(r.portfolioSources).toEqual({});
    expect(r.missingEverywhere).toEqual(["react", "typescript"]);
  });

  it("attributes portfolio evidence to user-described projects", () => {
    const r = analyzeEvidence("React", "React, TypeScript e Golang", [], {
      projects: [
        { id: "1", name: "Loja piloto", url: "", whatIDid: "Implementei TypeScript" },
        { id: "2", name: "API", url: "", whatIDid: "Serviço em Golang e React" },
      ],
    });
    expect(r.portfolioSources).toEqual({ typescript: ["Loja piloto"], golang: ["API"], react: ["API"] });
    expect(r.onlyInPortfolio).toEqual(["typescript", "golang"]);
    expect(r.ats).toBe(false);
  });

  it("falha com vaga vazia, CV vazio e URL que não é skill", () => {
    const empty = analyzeEvidence("", "", [], { portfolioUrl: "https://github.com/exemplo" });
    expect(empty.compared).toBe(0);
    expect(empty.ats).toBe(false);
    expect(empty.present).toEqual([]);
    const noPort = analyzeEvidence("html css", "React TypeScript Golang", [], { projects: [] });
    expect(noPort.missingEverywhere).toEqual(expect.arrayContaining(["react", "typescript", "golang"]));
    expect(noPort.onlyInPortfolio).toEqual([]);
  });
});
