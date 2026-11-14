import { describe, expect, it } from "vitest";
import { publicJobLinks } from "./public-links";

describe("publicJobLinks", () => {
  it("devolve anúncio + Google e recusa esquema que não é http", () => {
    const links = publicJobLinks({
      title: "Frontend júnior",
      company: "Empresa Exemplo",
      url: "https://example.com/vaga",
    });
    expect(links).toHaveLength(2);
    expect(links[0].href).toBe("https://example.com/vaga");
    expect(links[1].href).toMatch(/^https:\/\/www\.google\.com\/search\?q=/);
    expect(links[1].href).not.toMatch(/linkedin/i);
    expect(publicJobLinks({ url: "javascript:alert(1)" })).toHaveLength(0);
    expect(publicJobLinks({ url: "https://user:pass@example.com" })).toHaveLength(0);
  });
});
