"use client";

import { useState } from "react";
import { comparePortfolioExcerpt, type ExcerptResult } from "@/lib/portfolio-excerpt";

export function PortfolioExcerpt() {
  const [page, setPage] = useState("");
  const [job, setJob] = useState("");
  const [result, setResult] = useState<ExcerptResult | null>(null);
  return <section className="paper" style={{ marginTop: "1.5rem" }}>
    <h2>Comparar trecho de página</h2>
    <p>Copie texto visível que você tem autorização para usar. A comparação acontece neste navegador; não abrimos links nem verificamos a página ou sua autoria. O texto não é salvo como projeto.</p>
    <label htmlFor="portfolio-excerpt">Texto copiado da página</label>
    <textarea id="portfolio-excerpt" value={page} onChange={event => { setPage(event.target.value); setResult(null); }} aria-describedby="excerpt-limits" />
    <label htmlFor="portfolio-excerpt-job">Texto da vaga</label>
    <textarea id="portfolio-excerpt-job" value={job} onChange={event => { setJob(event.target.value); setResult(null); }} aria-describedby="excerpt-limits" />
    <p id="excerpt-limits" className="muted">Até 8.000 caracteres da página e 4.000 da vaga. Não cole HTML ou dados que não tenha autorização para usar.</p>
    <button type="button" onClick={() => setResult(comparePortfolioExcerpt(page, job))}>Comparar textos</button>
    {result && !result.ok ? <p role="alert" className="error-summary bad">{result.message}</p> : null}
    {result?.ok ? <div role="status"><h3>Menções no texto copiado</h3><p>São menções não verificadas; elas não comprovam autoria, uso ou experiência.</p>
      {!result.recognized ? <p>Nenhum termo técnico da vaga foi reconhecido.</p> : !result.mentions.length ? <p>Nenhum termo reconhecido da vaga apareceu no texto copiado.</p> : <ul className="list">{result.mentions.map(mention => <li key={mention.term}><strong>{mention.term}</strong>{mention.quotes.map((quote, i) => <blockquote key={i} style={{ overflowWrap: "anywhere" }}>{quote}</blockquote>)}</li>)}</ul>}
    </div> : null}
  </section>;
}
