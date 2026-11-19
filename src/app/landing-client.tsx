"use client";

import { useState } from "react";
import { analyzeEvidence, type EvidenceAnalysis } from "@/lib/match";
import { MAX_CV_CHARS } from "@/lib/limits";

const SAMPLE_CV =
  "Desenvolvi aplicações web em React, Next.js e TypeScript com testes automatizados em Vitest e PostgreSQL. Quero aprender Golang em projetos futuros.";
const SAMPLE_JOB =
  "Vaga Pessoa Desenvolvedora Full-Stack: experiência prática com React, Next.js, TypeScript, PostgreSQL, Golang e Docker.";

/** Requisitos do exemplo — mesma ordem das evidências, como um diff. */
const DEMO_REQUIREMENTS = [
  { term: "React · Next.js · TypeScript", weight: "obrigatório" },
  { term: "PostgreSQL", weight: "obrigatório" },
  { term: "Vitest", weight: "obrigatório" },
  { term: "Desenvolvimento web", weight: "obrigatório" },
  { term: "Golang", weight: "desejável" },
  { term: "Docker", weight: "desejável" },
] as const;

const DEMO_EVIDENCE = [
  { kind: "ok", quote: "“Desenvolvi aplicações web em React, Next.js e TypeScript…”, p. 1" },
  { kind: "ok", quote: "“…e PostgreSQL.”, p. 1" },
  { kind: "ok", quote: "“…testes automatizados em Vitest…”, p. 1" },
  { kind: "ok", quote: "“Desenvolvi aplicações web…”, p. 1" },
  { kind: "gap", quote: "“Quero aprender Golang” é estudo — não conta como experiência." },
  { kind: "gap", quote: "Ausente no currículo e no portfólio." },
] as const;

const SEGMENTS = 10;

function SegmentedMeter({ score }: { score: number }) {
  const filled = Math.round((score / 100) * SEGMENTS);
  return (
    <div className="vm-meter" role="img" aria-label={`Match ${score} de 100, ${filled} segmentos preenchidos de ${SEGMENTS}.`}>
      {Array.from({ length: SEGMENTS }, (_, index) => (
        <span key={index} className={index < filled ? "is-filled" : ""} aria-hidden="true" />
      ))}
    </div>
  );
}

export function LandingClient() {
  const [simCv, setSimCv] = useState("");
  const [simJob, setSimJob] = useState("");
  const [simResult, setSimResult] = useState<EvidenceAnalysis | null>(null);
  const [simNote, setSimNote] = useState("");

  function runSimulator(cvInput = simCv, jobInput = simJob) {
    setSimNote("");
    if (!cvInput.trim() || !jobInput.trim()) {
      setSimResult(null);
      setSimNote("Cole um trecho do currículo e o anúncio da vaga para comparar.");
      return;
    }
    setSimResult(analyzeEvidence(cvInput, jobInput, [], {}));
  }

  const flagged = simResult ? simResult.cvMentions.filter((m) => !m.noNegativeMarker) : [];

  const resultRows = simResult
    ? [
        ...simResult.present.map((term) => ({ term, kind: "ok" as const, note: "frase afirmativa no texto" })),
        ...flagged.map((m) => ({ term: m.term, kind: "gap" as const, note: `estudo ou negação — “${m.quote}”` })),
        ...simResult.missingEverywhere.map((term) => ({ term, kind: "gap" as const, note: "lacuna: ausente no currículo e nos projetos" })),
      ]
    : [];

  return (
    <>
      <a className="skip" href="#conteudo">
        Ir para o conteúdo
      </a>

      <div className="wrap">
        <header className="vm-topbar">
          <a className="vm-brand" href="/">
            Vaga<span>Match</span>
          </a>
          <nav className="vm-nav" aria-label="Seções da página">
            <a href="#simulador">Simulador</a>
            <a href="#comparar">Comparar</a>
            <a href="#planos">Planos</a>
            <a className="btn-link" href="/app">
              Abrir o painel
            </a>
          </nav>
        </header>
      </div>

      <main id="conteudo">
        <section className="wrap vm-hero" aria-labelledby="vm-hero-titulo">
          <p className="vm-hero-kicker">dossiê de candidatura · currículo × vaga</p>
          <h1 id="vm-hero-titulo" className="vm-hero-title">
            Descubra seu <em>match real</em> com a vaga — antes do RH.
          </h1>
          <p className="vm-sub">
            O VagaMatch compara linha a linha o seu currículo e portfólio com os requisitos da vaga,
            com evidência literal: a frase exata que comprova cada requisito, o que é só estudo e
            qual lacuna é real. Sem inventar nada no currículo. Não é ATS.
          </p>
          <div className="vm-actions">
            <a className="btn-link" href="#simulador">
              Comparar minha vaga agora
            </a>
            <a className="btn-link sec" href="/app">
              Abrir o painel
            </a>
          </div>
          <p className="vm-microproof">30 segundos · sem criar conta · seus dados ficam no seu navegador</p>

          <div className="vm-diffwrap">
            <div
              className="vm-diff"
              role="img"
              aria-label="Exemplo real do simulador: à esquerda os seis requisitos da vaga; à direita a evidência literal de cada um no currículo — React, Next.js, TypeScript, Vitest, PostgreSQL e desenvolvimento web comprovados; Golang e Docker marcados como lacuna. Match 67."
            >
              <div className="vm-diff-col">
                <p className="vm-diff-head">A vaga pede</p>
                <ol>
                  {DEMO_REQUIREMENTS.map((req, index) => (
                    <li className="vm-diff-row" key={req.term}>
                      <span className="vm-n">{String(index + 1).padStart(2, "0")}</span>
                      <span>
                        <span className="vm-term">{req.term}</span>
                        <span className="vm-weight">{req.weight}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="vm-diff-col is-evidence">
                <p className="vm-diff-head">Seu CV comprova</p>
                <ol>
                  {DEMO_EVIDENCE.map((item, index) => (
                    <li className="vm-diff-row" key={index}>
                      <span className="vm-n">{String(index + 1).padStart(2, "0")}</span>
                      <span className={item.kind === "gap" ? "vm-diff-note is-gap" : "vm-diff-note is-ok"}>
                        {item.kind === "gap" ? "lacuna" : "comprovado"}
                        <span className="vm-quote">{item.quote}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <aside className="vm-score" aria-label="Score do exemplo: match 67, 4 de 6 requisitos comprovados.">
              <p className="vm-score-num">67</p>
              <p className="vm-score-label">match</p>
              <SegmentedMeter score={67} />
              <p className="vm-meter-legend">4 de 6 requisitos comprovados no exemplo</p>
              <ul className="vm-subscores">
                <li>
                  requisitos cobertos <strong>4/6</strong>
                </li>
                <li>
                  evidência citada <strong>4</strong>
                </li>
                <li>
                  portfólio <strong>0</strong>
                </li>
              </ul>
            </aside>
          </div>
        </section>

        <div className="vm-proofbar">
          <div className="wrap vm-proofgrid">
            <div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span>
                <strong>Evidência literal</strong>, frase por frase — nada é acrescentado ao currículo
              </span>
            </div>
            <div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
              </svg>
              <span>
                <strong>“Quero aprender” não vira experiência</strong> — menções de estudo são sinalizadas
              </span>
            </div>
            <div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              <span>
                <strong>Follow-up D+7</strong> por vaga, no histórico Kanban — você envia, não a máquina
              </span>
            </div>
            <div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M9 17H7A5 5 0 017 7h2m6 10h2a5 5 0 000-10h-2M8 12h8" />
              </svg>
              <span>
                <strong>Importe vagas</strong> de Greenhouse, Remotar, Lever e Ashby — LinkedIn não
              </span>
            </div>
          </div>
        </div>

        <section id="simulador" className="vm-section band" aria-labelledby="vm-sim-titulo">
          <div className="wrap">
            <p className="vm-kicker">01 — simulador</p>
            <h2 id="vm-sim-titulo">Teste agora em 30 segundos — sem criar conta</h2>
            <p className="vm-intro">
              Cole um trecho do currículo e o anúncio da vaga. A comparação roda neste navegador e
              nada é enviado a servidor nenhum.
            </p>
            <div className="grid two">
              <div>
                <label htmlFor="vm-cv">Trecho do seu currículo</label>
                <textarea
                  id="vm-cv"
                  value={simCv}
                  maxLength={MAX_CV_CHARS}
                  placeholder="Ex.: Desenvolvi aplicações em React, Next.js e TypeScript..."
                  onChange={(e) => setSimCv(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="vm-job">Anúncio ou requisitos da vaga</label>
                <textarea
                  id="vm-job"
                  value={simJob}
                  placeholder="Cole aqui a descrição da vaga que você quer disputar..."
                  onChange={(e) => setSimJob(e.target.value)}
                />
              </div>
            </div>
            <div className="actions">
              <button type="button" onClick={() => runSimulator()}>
                Comparar evidências agora
              </button>
              <button
                className="sec"
                type="button"
                onClick={() => {
                  setSimCv(SAMPLE_CV);
                  setSimJob(SAMPLE_JOB);
                  runSimulator(SAMPLE_CV, SAMPLE_JOB);
                }}
              >
                Testar com exemplo real
              </button>
            </div>
            {simNote ? (
              <p className="muted" role="status" style={{ marginTop: "0.75rem" }}>
                {simNote}
              </p>
            ) : null}
            {simResult ? (
              <div className="vm-result" role="region" aria-label="Resultado da comparação">
                <p className="vm-kicker" style={{ margin: "0 0 4px" }}>
                  resultado · {simResult.compared} requisito(s) comparado(s)
                </p>
                <p className="muted" style={{ margin: 0 }}>
                  {simResult.present.length} com frase afirmativa no texto analisado.
                </p>
                <div className="vm-diff">
                  <div className="vm-diff-col">
                    <p className="vm-diff-head">A vaga pede</p>
                    <ol>
                      {resultRows.map((row, index) => (
                        <li className="vm-diff-row" key={`left-${row.term}-${index}`}>
                          <span className="vm-n">{String(index + 1).padStart(2, "0")}</span>
                          <span className="vm-term">{row.term}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="vm-diff-col is-evidence">
                    <p className="vm-diff-head">Seu CV comprova</p>
                    <ol>
                      {resultRows.map((row, index) => (
                        <li className="vm-diff-row" key={`right-${row.term}-${index}`}>
                          <span className="vm-n">{String(index + 1).padStart(2, "0")}</span>
                          <span className={row.kind === "gap" ? "vm-diff-note is-gap" : "vm-diff-note is-ok"}>
                            {row.kind === "gap" ? "lacuna" : "comprovado"}
                            <span className="vm-quote">{row.note}</span>
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
                <p className="muted" style={{ marginTop: "1rem" }}>
                  {simResult.note}{" "}
                  <a href="/vagas">Guardar esta vaga e acompanhar o D+7 no painel</a>.
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <section id="comparar" className="vm-section" aria-labelledby="vm-comparar-titulo">
          <div className="wrap">
            <p className="vm-kicker">02 — comparativo</p>
            <h2 id="vm-comparar-titulo">Por que não abrir o ChatGPT numa 2ª aba?</h2>
            <p className="vm-intro">
              O ChatGPT otimiza texto. Ele não sabe o que você viveu — e é aí que nasce o currículo
              inventado. A diferença do VagaMatch é o rastro: cada requisito aponta para a frase do
              seu texto que o comprova (ou para a lacuna que falta preencher).
            </p>
            <div className="vm-compare">
              <div className="vm-col chatgpt">
                <h3>ChatGPT numa 2ª aba</h3>
                <ul>
                  <li>Pode escrever experiência que você não tem — e você descobre na entrevista</li>
                  <li>Não mostra qual frase do seu CV sustenta cada requisito</li>
                  <li>Nada fica guardado por vaga: cola tudo de novo amanhã</li>
                  <li>Sem histórico, sem Kanban, sem lembrete de follow-up</li>
                </ul>
              </div>
              <div className="vm-col vagamatch">
                <h3>VagaMatch</h3>
                <ul>
                  <li>Aponta a frase exata do seu texto que comprova cada requisito</li>
                  <li>“Quero aprender” entra como estudo, nunca como experiência</li>
                  <li>Cada vaga fica salva com lacunas, status e histórico Kanban</li>
                  <li>Lembrete D+7 — o follow-up você escreve e envia</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="planos" className="vm-section band" aria-labelledby="vm-planos-titulo">
          <div className="wrap">
            <p className="vm-kicker">03 — planos</p>
            <h2 id="vm-planos-titulo">Um passe para o ciclo de busca, não mais uma assinatura</h2>
            <p className="vm-intro">
              Quem busca recolocação precisa de foco por 60 a 90 dias. Compare localmente de graça
              ou sincronize o painel entre celular e computador.
            </p>
            <div className="vm-plans">
              <div className="vm-plan">
                <h3>Navegador</h3>
                <p className="vm-price">R$ 0</p>
                <ul>
                  <li>Comparação CV × vaga × portfólio com evidência literal</li>
                  <li>Leitura de PDF local (PDF.js, sem upload)</li>
                  <li>Kanban de candidaturas e follow-ups D+7</li>
                  <li>Backup exportável em JSON ou cifrado (AES-GCM)</li>
                  <li className="is-absent">Sincronização em nuvem — ausente neste plano</li>
                </ul>
                <a className="btn-link" href="/app">
                  Usar agora no navegador
                </a>
              </div>
              <div className="vm-plan destaque">
                <span className="vm-selo">recomendado para o ciclo de 90 dias</span>
                <h3>Passe 90 Dias</h3>
                <p className="vm-price">R$ 79</p>
                <ul>
                  <li>Pagamento único — R$ 26,33/mês pelo ciclo completo</li>
                  <li>Tudo do plano Navegador</li>
                  <li>Sincronização entre celular e computador, sem limite de vagas</li>
                  <li>Fila D+7 e histórico completos por 90 dias</li>
                </ul>
                <a className="btn-link" href="/conta">
                  Garantir no Acesso Antecipado
                </a>
              </div>
              <div className="vm-plan">
                <h3>Mensal Flexível</h3>
                <p className="vm-price">R$ 34,90/mês</p>
                <ul>
                  <li>Sincronização em nuvem mês a mês</li>
                  <li>Histórico Kanban e lembretes D+7 sincronizados</li>
                  <li>Cancele quando largar a vaga</li>
                  <li className="is-absent">Passe de 90 dias — ausente neste plano</li>
                </ul>
                <a className="btn-link" href="/conta">
                  Criar conta em Acesso Antecipado
                </a>
              </div>
            </div>
            <p className="vm-plannota">
              A cobrança via Pix/cartão entra no ar junto com a ativação dos pagamentos; até lá, a
              sincronização em nuvem está liberada sem custo em Conta. Seus dados seguem exportáveis
              a qualquer momento.
            </p>
          </div>
        </section>

        <section className="vm-final" aria-labelledby="vm-final-titulo">
          <div className="wrap">
            <h2 id="vm-final-titulo">A próxima vaga merece 30 segundos antes do envio.</h2>
            <div className="vm-actions">
              <a className="btn-link" href="#simulador">
                Comparar minha vaga agora
              </a>
              <a className="btn-link sec" href="/app">
                Abrir o painel
              </a>
            </div>
          </div>
        </section>
      </main>

      <div className="wrap">
        <footer className="vm-footer">
          <nav aria-label="Rotas do painel">
            <a href="/app">Painel</a>
            <a href="/curriculo">Currículo</a>
            <a href="/vagas">Vagas</a>
            <a href="/portfolio">Portfólio</a>
            <a href="/historico">Histórico</a>
            <a href="/conta">Conta</a>
            <a href="/privacidade">Privacidade</a>
          </nav>
          <p>O VagaMatch não se candidata por você: ele rascunha e registra — quem envia é você.</p>
        </footer>
      </div>
    </>
  );
}
