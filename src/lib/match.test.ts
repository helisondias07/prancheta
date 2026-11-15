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

  it("cita a frase do CV e não conta menção negativa ou hipotética como afirmativa", () => {
    const r = analyzeEvidence(
      "Implementei uma vitrine em React. Talvez use TypeScript; não usei Golang.",
      "React, TypeScript e Golang",
    );
    expect(r.present).toEqual(["react"]);
    expect(r.cvMentions).toEqual([
      { term: "react", quote: "Implementei uma vitrine em React.", noNegativeMarker: true },
      { term: "typescript", quote: "Talvez use TypeScript;", noNegativeMarker: false },
      { term: "golang", quote: "não usei Golang.", noNegativeMarker: false },
    ]);
    expect(r.missingEverywhere).toEqual([]);
  });

  it.each([
    "Quero aprender React.",
    "I want to learn React.",
    "I WANT TO LEARN REACT.",
    "Aprendendo React.",
    "Estou aprendendo React.",
    "I am learning React.",
    "Sem experiência com React.",
    "No experience with React.",
    "Não usei React.",
    "Não uso React.",
    "I don't use React.",
    "WANT TO LEARN React.",
    "Talvez React.",
  ])("mantém intenção ou negação como menção não confirmada: %s", (cv) => {
    const result = matchCvToJob(cv, "React");
    expect(result.present).toEqual([]);
    expect(result.cvMentions).toMatchObject([{ term: "react", noNegativeMarker: false }]);
  });

  it("separa contextos distintos e usa a frase afirmativa para pedir confirmação do projeto", () => {
    const result = analyzeEvidence("Quero aprender React. Já implementei React.", "React", [], {
      projects: [{
        id: "p1", name: "Demo", url: "", whatIDid: "Quero aprender React. Implementei React em outro contexto.",
        confirmedSkills: ["react"], confirmedSkillDescriptions: { react: "Quero aprender React. Implementei React em outro contexto." },
      }],
    });
    expect(result.present).toEqual(["react"]);
    expect(result.cvMentions.map((mention) => mention.noNegativeMarker)).toEqual([false, true]);
    expect(result.portfolioMentions[0]).toMatchObject({
      quote: "Implementei React em outro contexto.",
      quotes: ["Quero aprender React.", "Implementei React em outro contexto."],
      confirmable: true,
      confirmed: true,
    });
  });

  it("não oferece confirmação para um projeto descrito apenas como intenção", () => {
    const result = analyzeEvidence("", "React", [], {
      projects: [{ id: "p1", name: "Demo", url: "", whatIDid: "Quero aprender React.", confirmedSkills: ["react"] }],
    });
    expect(result.portfolioMentions[0]).toMatchObject({
      quote: "Quero aprender React.",
      confirmable: false,
      confirmed: false,
    });
  });

  it("separa evidência do portfólio sem inventar no CV nem chamar ATS", () => {
    const r = analyzeEvidence(
      "Trabalhei com React e TypeScript.",
      "Buscamos React, TypeScript e Golang.",
      [],
      { projects: [{ name: "API", url: "https://example.com/api", whatIDid: "service in Golang", confirmedSkills: ["golang"], confirmedSkillDescriptions: { golang: "service in Golang" } }] },
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
        { id: "1", name: "Loja piloto", url: "", whatIDid: "Implemented TypeScript", confirmedSkills: ["typescript"], confirmedSkillDescriptions: { typescript: "Implemented TypeScript" } },
        { id: "2", name: "API", url: "", whatIDid: "Service in Golang and React", confirmedSkills: ["golang", "react"], confirmedSkillDescriptions: { golang: "Service in Golang and React", react: "Service in Golang and React" } },
      ],
    });
    expect(r.portfolioSources).toEqual({ typescript: ["Loja piloto"], golang: ["API"], react: ["API"] });
    expect(r.onlyInPortfolio).toEqual(["typescript", "golang"]);
    expect(r.ats).toBe(false);
  });

  it("does not treat project titles or URLs as mentions", () => {
    const r = analyzeEvidence("", "React", [], {
      portfolioUrl: "https://example.com/react",
      projects: [{ id: "p1", name: "React", url: "https://example.com/react", whatIDid: "Personal project" }],
    });
    expect(r.inPortfolio).toEqual([]);
    expect(r.portfolioMentions).toEqual([]);
    expect(r.missingEverywhere).toContain("react");
  });

  it("keeps hypothetical and negated text as unverified quoted mentions", () => {
    const r = analyzeEvidence("", "React", [], {
      projects: [
        { id: "p1", name: "Maybe", url: "", whatIDid: "Talvez React", confirmedSkills: ["react"] },
        { id: "p2", name: "No", url: "", whatIDid: "n\u00e3o usei React.", confirmedSkills: ["react"] },
      ],
    });
    expect(r.inPortfolio).toEqual([]);
    expect(r.onlyInPortfolio).toEqual([]);
    expect(r.portfolioMentions).toEqual([
      { term: "react", projectId: "p1", projectName: "Maybe", projectUrl: "", quote: "Talvez React", quotes: ["Talvez React"], confirmed: false, confirmable: false },
      { term: "react", projectId: "p2", projectName: "No", projectUrl: "", quote: "n\u00e3o usei React.", quotes: ["n\u00e3o usei React."], confirmed: false, confirmable: false },
    ]);
  });

  it("counts a mention only after explicit user confirmation", () => {
    const r = analyzeEvidence("", "React", [], {
      projects: [{ id: "p1", name: "Project", url: "https://example.com/project", whatIDid: "Implementei React no projeto.", confirmedSkills: ["react"], confirmedSkillDescriptions: { react: "Implementei React no projeto." } }],
    });
    expect(r.inPortfolio).toEqual(["react"]);
    expect(r.portfolioMentions[0]).toMatchObject({ projectUrl: "https://example.com/project", quote: "Implementei React no projeto.", confirmed: true, confirmable: true });
  });

  it("invalida confirmação antiga quando descrição muda ou vira hipotética/negativa", () => {
    const oldDescription = "Implementei React na vitrine.";
    for (const whatIDid of [
      "Implementei React na loja.", "Quero aprender React.", "I want to learn React.",
      "I am learning React.", "No experience with React.", "Don't use React.", "Não uso React.", "Talvez React.",
    ]) {
      const result = analyzeEvidence("", "React", [], {
        projects: [{
          id: "p1", name: "Demo", url: "", whatIDid,
          confirmedSkills: ["react"], confirmedSkillDescriptions: { react: oldDescription },
        }],
      });
      expect(result.inPortfolio).toEqual([]);
      expect(result.portfolioMentions[0].confirmed).toBe(false);
      expect(result.portfolioMentions[0].confirmable).toBe(whatIDid === "Implementei React na loja.");
    }
  });

  it("não confia confirmação legada sem descrição vinculada", () => {
    const result = analyzeEvidence("", "React", [], {
      projects: [{ id: "p1", name: "Legacy", url: "", whatIDid: "Implementei React.", confirmedSkills: ["react"] }],
    });
    expect(result.inPortfolio).toEqual([]);
    expect(result.portfolioMentions[0]).toMatchObject({ confirmed: false, confirmable: true });
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
