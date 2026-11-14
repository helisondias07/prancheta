import { describe, expect, it } from "vitest";
import { classifyUrlOrToken, fetchGreenhouseBoard, fetchRemotar, remotarJobUrl } from "./sources";

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

  it("asks for a source when empty", () => {
    const r = classifyUrlOrToken("   ");
    expect(r.kind).toBe("manual");
    expect(r.reason).toMatch(/Informe/);
  });
});

describe("fetchGreenhouseBoard", () => {
  it("maps public JSON without full HTML content and caps", async () => {
    const jobs = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      title: `Frontend ${i + 1}`,
      absolute_url: `https://boards.greenhouse.io/acme/jobs/${i + 1}`,
      location: { name: "Remote" },
    }));
    const fetcher = async () => new Response(JSON.stringify({ jobs }), { status: 200 });
    const result = await fetchGreenhouseBoard("acme", fetcher as unknown as typeof fetch);
    expect(result.jobs).toHaveLength(5);
    expect(result.total).toBe(5);
    expect(result.jobs[0].url).toBe("https://boards.greenhouse.io/acme/jobs/1");
    expect(result.jobs[0].text).toMatch(/Abra o anúncio/);
  });

  it("caps a 786-job board", async () => {
    const jobs = Array.from({ length: 786 }, (_, i) => ({ id: i, title: `J${i}` }));
    const fetcher = async () => new Response(JSON.stringify({ jobs }), { status: 200 });
    const result = await fetchGreenhouseBoard("stripe", fetcher as unknown as typeof fetch);
    expect(result.jobs).toHaveLength(40);
    expect(result.total).toBe(786);
    expect(result.capped).toBe(true);
  });
});

describe("remotarJobUrl", () => {
  it("prefers the job externalLink over the generic site", () => {
    expect(
      remotarJobUrl({
        id: 171487,
        externalLink: "https://agriness.gupy.io/job/abc",
      }),
    ).toBe("https://agriness.gupy.io/job/abc");
    expect(remotarJobUrl({ id: 9 })).toBe("https://remotar.com.br/vaga/9");
    expect(remotarJobUrl({})).toBe("");
  });
});

describe("fetchRemotar", () => {
  it("uses externalLink", async () => {
    const fetcher = async () =>
      new Response(
        JSON.stringify([
          {
            id: 1,
            title: "Dev",
            company: "Acme",
            externalLink: "https://acme.gupy.io/job/1",
            description: "<p>React</p>",
          },
        ]),
        { status: 200 },
      );
    const result = await fetchRemotar(fetcher as unknown as typeof fetch);
    expect(result.jobs[0].url).toBe("https://acme.gupy.io/job/1");
    expect(result.jobs[0].text).toBe("React");
  });
});
