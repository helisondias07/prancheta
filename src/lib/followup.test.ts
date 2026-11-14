import { describe, expect, it } from "vitest";
import { isFeedbackDue } from "./followup";

describe("isFeedbackDue", () => {
  it("is false before seven days", () => {
    const applied = new Date("2026-11-01T12:00:00Z").toISOString();
    const now = Date.parse("2026-11-06T12:00:00Z");
    expect(isFeedbackDue(applied, now)).toBe(false);
  });

  it("is true at seven days", () => {
    const applied = new Date("2026-11-01T12:00:00Z").toISOString();
    const now = Date.parse("2026-11-08T12:00:00Z");
    expect(isFeedbackDue(applied, now)).toBe(true);
  });
});
