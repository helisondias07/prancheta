import { describe, expect, it } from "vitest";
import { draftMessage } from "./draft";
import { emptyStore } from "./types";

describe("draftMessage", () => {
  it("never claims the message was sent and omits empty name", () => {
    const profile = emptyStore().profile;
    const { body, sent } = draftMessage({
      profile,
      jobTitle: "Dev júnior",
      company: "Exemplo",
      jobUrl: "https://example.com/vaga",
      match: {
        score: 0,
        present: [],
        missing: ["golang"],
        compared: 1,
        invented: false,
        ats: false,
        note: "",
      },
    });
    expect(sent).toBe(false);
    expect(body).toMatch(/não foi enviada/i);
    expect(body).not.toMatch(/golang/i);
    expect(body.startsWith("Olá.")).toBe(true);
  });

  it("menciona skill só no portfólio sem fingir que está no CV", () => {
    const profile = emptyStore().profile;
    const { body } = draftMessage({
      profile: {
        ...profile,
        projects: [{ id: "p1", name: "API", url: "https://example.com/api", whatIDid: "serviço em Golang" }],
      },
      jobTitle: "Dev",
      company: "Exemplo",
      jobUrl: "",
      match: {
        score: 0,
        present: ["react"],
        missing: ["golang"],
        compared: 2,
        invented: false,
        ats: false,
        note: "",
        inPortfolio: ["golang"],
        onlyInPortfolio: ["golang"],
        missingEverywhere: [],
        portfolioMentions: [],
        coverage: { job: 2, cv: 1, portfolio: 1, either: 2 },
      },
    });
    expect(body).toMatch(/No currículo[\s\S]*react/i);
    expect(body).toMatch(/não está no CV[\s\S]*golang/i);
    expect(body).not.toMatch(/No currículo que eu mesmo colei constam:.*golang/i);
  });


  it("does not copy hypothetical portfolio text into an application draft", () => {
    const profile = emptyStore().profile;
    const { body } = draftMessage({
      profile: {
        ...profile,
        projects: [{ id: "p1", name: "React demo", url: "", whatIDid: "Talvez React" }],
      },
      jobTitle: "Dev",
      company: "",
      jobUrl: "",
      match: {
        score: 0,
        present: [],
        missing: ["react"],
        compared: 1,
        invented: false,
        ats: false,
        note: "",
      },
    });
    expect(body).not.toContain("Talvez React");
    expect(body).not.toContain("React demo");
  });
});
