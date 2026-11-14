import { describe, expect, it } from "vitest";
import { classifyUrlOrToken, fetchGreenhouseBoard } from "./sources";

describe("classifyUrlOrToken", () => {
  it("blocks LinkedIn", () => {
    const r = classifyUrlOrToken("https://www.linkedin.com/jobs/view/123");
    expect(r.kind).toBe("blocked");
    expect(r.reason).toMatch(/LinkedIn/);
  });

  it("reads greenhouse board from URL", () => {
    expect(classifyUrlOrToken("https://boards.greenhouse.io/stripe/jobs/1")).toEqual({
      kind: "greenhouse",
      board: "stripe",
    });
  });

  it("accepts remotar", () => {
    expect(classifyUrlOrToken("remotar").kind).toBe("remotar");
  });
});

describe("fetchGreenhouseBoard", () => {
  it("maps public JSON", async () => {
    const fetcher = async () =>
      new Response(
        JSON.stringify({
          jobs: [
            {
              id: 1,
              title: "Frontend",
              absolute_url: "https://boards.greenhouse.io/acme/jobs/1",
              location: { name: "Remote" },
              content: "<p>React</p>",
            },
          ],
        }),
        { status: 200 },
      );
    const jobs = await fetchGreenhouseBoard("acme", fetcher as unknown as typeof fetch);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe("Frontend");
    expect(jobs[0].text).toBe("React");
    expect(jobs[0].source).toBe("greenhouse");
  });
});
