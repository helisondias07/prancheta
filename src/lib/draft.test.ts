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
        note: "",
      },
    });
    expect(sent).toBe(false);
    expect(body).toMatch(/não foi enviada/i);
    expect(body).not.toMatch(/golang/i);
    expect(body.startsWith("Olá.")).toBe(true);
  });
});
