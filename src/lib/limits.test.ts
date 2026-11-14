import { describe, expect, it } from "vitest";
import { MAX_IMPORT, capJobs, clipText } from "./limits";

describe("capJobs", () => {
  it("keeps at most 40 and reports the real total", () => {
    const { jobs, total, capped } = capJobs(Array.from({ length: 786 }, (_, i) => i));
    expect(jobs).toHaveLength(MAX_IMPORT);
    expect(total).toBe(786);
    expect(capped).toBe(true);
  });
});

describe("clipText", () => {
  it("does not invent content when clipping", () => {
    const long = "ab".repeat(3000);
    const out = clipText(long);
    expect(out.endsWith("…")).toBe(true);
    expect(out.startsWith("ab")).toBe(true);
    expect(out.length).toBeLessThan(long.length);
  });
});
