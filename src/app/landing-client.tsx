"use client";

import { useState } from "react";
import { analyzeEvidence, type EvidenceAnalysis } from "@/lib/match";
import { MAX_CV_CHARS } from "@/lib/limits";

const SAMPLE_CV =
  "Desenvolvi aplicações web em React, Next.js e TypeScript com testes automatizados em Vitest e PostgreSQL. Quero aprender Golang em projetos futuros.";
const SAMPLE_JOB =
  "Vaga Pessoa Desenvolvedora Full-Stack: experiência prática com React, Next.js, TypeScript, PostgreSQL, Golang e Docker.";

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
            <a href="#comparar">Comparar com ChatGPT</a>
            <a href="#planos">Planos</a>
            <a className="btn-link" href="/app">
              Abrir o painel
            </a>
          </nav>
        </header>
      </div>

      <main id="conteudo">
        <section className="vm-hero wrap" aria-labelledby="vm-hero-titulo">
          <h1 id="vm-hero-titulo">
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

          <div className="vm-mock" role="img" aria-label="Exemplo real do simulador: currículo à esquerda, requisitos da vaga à direita, anel de score de 67% com 4 de 6 requisitos comprovados, Golang sinalizado como estudo e Docker como lacuna real.">
            <div className="vm-card">
              <h3>Seu currículo (PDF)</h3>
              <div className="vm-doc-line w80" />
              <div className="vm-doc-line" />
              <div className="vm-evidence">
                <strong>Comprova · React, Next.js, TypeScript, PostgreSQL</strong>
                “Desenvolvi aplicações web em React, Next.js e TypeScript… e PostgreSQL.”
              </div>
              <div className="vm-doc-line w60" />
              <div className="vm-evidence estudo">
                <strong>Estudo — não conta como experiência</strong>
                “Quero aprender Golang em projetos futuros.”
              </div>
            </div>
            <div className="vm-ringbox">
              <svg className="vm-ring" viewBox="0 0 140 140" aria-hidden="true">
                <circle className="trilha" cx="70" cy="70" r="54" fill="none" strokeWidth="11" />
                <circle
                  className="arco"
                  cx="70"
                  cy="70"
                  r="54"
                  fill="none"
                  strokeWidth="11"
                  strokeLinecap="round"
                  strokeDasharray="339.3"
                  strokeDashoffset="111.97"
                  transform="rotate(-90 70 70)"
                />
                <text x="70" y="72" textAnchor="middle">
                  67%
                </text>
              </svg>
              <p className="vm-ringcap">4 de 6 requisitos comprovados no exemplo</p>
            </div>
            <div className="vm-card">
              <h3>Requisitos da vaga</h3>
              <div className="vm-req ok">
                <span className="vm-term">React · Next.js · TypeScript</span>
                <span className="vm-why">frase afirmativa no CV</span>
              </div>
              <div className="vm-req ok">
                <span className="vm-term">PostgreSQL</span>
                <span className="vm-why">comprovado no CV</span>
              </div>
              <div className="vm-req falta">
                <span className="vm-term">Golang</span>
                <span className="vm-why">só “quero aprender” — lacuna real</span>
              </div>
              <div className="vm-req falta">
                <span className="vm-term">Docker</span>
                <span className="vm-why">ausente no CV e no portfólio</span>
              </div>
            </div>
          </div>
        </section>

        <div className="vm-proofbar">
          <div className="wrap vm-proofgrid">
            <div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--match)" strokeWidth="2.4" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span>
                <strong>Evidência literal</strong>, frase por frase — nada é acrescentado ao currículo
              </span>
            </div>
            <div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--aviso)" strokeWidth="2" aria-hidden="true">
                <path d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
              </svg>
              <span>
                <strong>“Quero aprender” não vira experiência</strong> — menções de estudo são sinalizadas
              </span>
            </div>
            <div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primario)" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              <span>
                <strong>Follow-up D+7</strong> por vaga, no histórico Kanban — você envia, não a máquina
              </span>
            </div>
            <div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primario)" strokeWidth="2" aria-hidden="true">
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
              <div
                style={{ marginTop: "1rem", borderTop: "1px solid var(--linha)", paddingTop: "0.85rem" }}
                role="region"
                aria-label="Resultado da comparação"
              >
                <p>
                  <strong>
                    {simResult.present.length} de {simResult.compared} requisito(s) técnico(s)
                  </strong>{" "}
                  com frase afirmativa no texto analisado.
                </p>
                <ul className="list">
                  <li className="ok">
                    <strong>Comprovados no texto:</strong>{" "}
                    {simResult.present.length ? simResult.present.join(", ") : "nenhum termo afirmativo encontrado"}
                  </li>
                  {flagged.length ? (
                    <li className="warn">
                      <strong>Sinalizados como estudo ou negação (não entram como experiência):</strong>{" "}
                      {flagged.map((m) => `${m.term} (“${m.quote}”)`).join("; ")}
                    </li>
                  ) : null}
                  <li className={simResult.missingEverywhere.length ? "bad" : "muted"}>
                    <strong>Ausentes no currículo e nos projetos:</strong>{" "}
                    {simResult.missingEverywhere.length ? simResult.missingEverywhere.join(", ") : "nenhum requisito faltante"}
                  </li>
                </ul>
                <p className="muted" style={{ marginTop: "0.6rem" }}>
                  {simResult.note}{" "}
                  <a href="/vagas">Guardar esta vaga e acompanhar o D+7 no painel</a>.
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <section id="comparar" className="vm-section" aria-labelledby="vm-comparar-titulo">
          <div className="wrap">
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
                </ul>
                <a className="btn-link sec" href="/app">
                  Usar agora no navegador
                </a>
              </div>
              <div className="vm-plan destaque">
                <span className="vm-selo">Mais escolhido · Pix</span>
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
                </ul>
                <a className="btn-link sec" href="/conta">
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
