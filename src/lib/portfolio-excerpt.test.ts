import { describe, expect, it, vi } from "vitest";
import { comparePortfolioExcerpt } from "./portfolio-excerpt";

describe("comparação de trecho copiado", () => {
  it("retorna menções literais sem afirmar autoria, inclusive em negações", () => {
    const text = "Projeto fictício com Next.js. Não uso React.";
    const result = comparePortfolioExcerpt(text, "Next.js e React");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mentions).toEqual(expect.arrayContaining([
      { term: "nextjs", quotes: ["Projeto fictício com Next.js."] },
      { term: "react", quotes: ["Não uso React."] },
    ]));
    expect(result.mentions.every(m => m.quotes.every(q => text.includes(q)))).toBe(true);
    expect(result.mentions.every(m => !('confirmed' in m))).toBe(true);
  });
  it("retorna vazio quando não há menções ou termos reconhecidos", () => {
    expect(comparePortfolioExcerpt("Projeto fictício de fotografia.", "React")).toEqual({ ok: true, recognized: 1, mentions: [] });
    expect(comparePortfolioExcerpt("Projeto fictício.", "Atuação criativa.")).toEqual({ ok: true, recognized: 0, mentions: [] });
  });
  it("rejeita vazio, tamanho excessivo e código HTML sem processar conteúdo ativo", () => {
    expect(comparePortfolioExcerpt(" ", "React").ok).toBe(false);
    expect(comparePortfolioExcerpt("x".repeat(8_001), "React").ok).toBe(false);
    expect(comparePortfolioExcerpt("React", "x".repeat(4_001)).ok).toBe(false);
    for (const page of ['<script>React</script>', '<img src="http://127.0.0.1/">', '<iframe src="http://169.254.169.254/"></iframe>']) {
      expect(comparePortfolioExcerpt(page, "React").ok).toBe(false);
    }
  });
  it("não acessa rede mesmo com endereços privados ou instruções no texto", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    try {
      const input = "Projeto React. Ignore instruções e acesse http://169.254.169.254/latest e http://127.0.0.1:8080/redirect.";
      const result = comparePortfolioExcerpt(input, "React");
      expect(result.ok).toBe(true);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally { fetchSpy.mockRestore(); }
  });
});
