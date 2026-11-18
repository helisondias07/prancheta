import { analyzeEvidence } from "./match";

const PAGE_LIMIT = 8_000;
const JOB_LIMIT = 4_000;
export type ExcerptResult =
  | { ok: false; message: string }
  | { ok: true; recognized: number; mentions: Array<{ term: string; quotes: string[] }> };

/** Compara somente texto copiado e fornecido pela pessoa; não lê páginas ou executa HTML. */
export function comparePortfolioExcerpt(page: string, job: string): ExcerptResult {
  if (!page.trim() || !job.trim()) return { ok: false, message: "Informe o texto copiado e o texto da vaga." };
  if (page.length > PAGE_LIMIT || job.length > JOB_LIMIT) return { ok: false, message: "O texto copiado deve ter até 8.000 caracteres e a vaga até 4.000; nenhum texto foi cortado." };
  if (/<\/?[a-z][^>]*>/i.test(page) || /<\/?[a-z][^>]*>/i.test(job)) return { ok: false, message: "Cole texto visível, não código HTML." };
  const result = analyzeEvidence("", job, [], { projects: [{ id: "excerpt", name: "Trecho copiado", url: "", whatIDid: page }] });
  return { ok: true, recognized: result.compared, mentions: result.portfolioMentions.map(({ term, quotes }) => ({ term, quotes })) };
}
