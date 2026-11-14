import { describe, expect, it } from "vitest";
import { classifyUrlOrToken, fetchGreenhouseBoard, fetchLeverBoard, fetchRemotar, remotarJobUrl } from "./sources";

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

  it("accepts only Lever board identifiers or hosted job-board URLs", () => {
    expect(classifyUrlOrToken("lever:Acme")).toEqual({ kind: "lever", board: "Acme" });
    expect(classifyUrlOrToken("https://jobs.lever.co/acme/123")).toEqual({ kind: "lever", board: "acme" });
    expect(classifyUrlOrToken("https://jobs.lever.co/acme.evil").kind).toBe("blocked");
    expect(classifyUrlOrToken("https://evil.example/?next=jobs.lever.co/acme").kind).toBe("blocked");
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

describe("fetchLeverBoard", () => {
  it("requests the fixed public API and maps capped, plain-text jobs", async () => {
    let requested = "";
    let redirectMode: RequestRedirect | undefined;
    const jobs = Array.from({ length: 45 }, (_, i) => ({
      text: `Frontend ${i + 1}`,
      hostedUrl: `https://jobs.lever.co/acme/${i + 1}`,
      descriptionPlain: "React & TypeScript",
      categories: { allLocations: ["Remoto", "Brasil"] },
    }));
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      requested = String(input);
      redirectMode = init?.redirect;
      return new Response(JSON.stringify(jobs), { status: 200 });
    };
    const result = await fetchLeverBoard("Acme", fetcher as unknown as typeof fetch);
    expect(requested).toBe("https://api.lever.co/v0/postings/acme?mode=json&limit=41");
    expect(redirectMode).toBe("error");
    expect(result.jobs).toHaveLength(40);
    expect(result.total).toBe(45);
    expect(result.capped).toBe(true);
    expect(result.jobs[0]).toMatchObject({
      title: "Frontend 1",
      company: "acme",
      url: "https://jobs.lever.co/acme/1",
      location: "Remoto, Brasil",
      text: "React & TypeScript",
      source: "lever",
    });
  });

  it("rejects malformed board names and unexpected JSON shapes", async () => {
    await expect(fetchLeverBoard("acme.example", fetch as typeof fetch)).rejects.toThrow("inválido");
    const fetcher = async () => new Response(JSON.stringify({ jobs: [] }), { status: 200 });
    await expect(fetchLeverBoard("acme", fetcher as unknown as typeof fetch)).rejects.toThrow("inesperado");
  });

  it("keeps Lever requirement lists when descriptions are empty and strips active HTML", async () => {
    const fetcher = async () => new Response(JSON.stringify([{
      text: "Dentist",
      hostedUrl: "https://jobs.lever.co/acme/dentist",
      descriptionPlain: "",
      lists: [{
        text: "Requirements",
        content: '<ul><li>React &amp; TypeScript</li><li><b>APIs</b> com Node</li><script>alert("x")</script><img src=x onerror="alert(2)"></ul>',
      }],
    }]), { status: 200 });
    const result = await fetchLeverBoard("acme", fetcher as unknown as typeof fetch);
    const text = result.jobs[0].text;
    expect(text).toContain("Requirements: • React & TypeScript • APIs com Node");
    expect(text).not.toMatch(/[<>]|alert\s*\(|onerror|\bscript\b/i);
  });

  it("keeps requirements first while respecting the text limit", async () => {
    const fetcher = async () => new Response(JSON.stringify([{
      text: "Director",
      lists: [{ text: "Requirements", content: "React" }],
      descriptionPlain: "D".repeat(5000),
    }]), { status: 200 });
    const result = await fetchLeverBoard("acme", fetcher as unknown as typeof fetch);
    expect(result.jobs[0].text.startsWith("Requirements: React")).toBe(true);
    expect(result.jobs[0].text.length).toBeLessThanOrEqual(4001);
    expect(result.jobs[0].text.endsWith("…")).toBe(true);
  });
});
