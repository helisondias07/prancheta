"use client";

import { useMemo, useState } from "react";
import { canRegister, upsertApplication } from "@/lib/applications";
import { draftMessage } from "@/lib/draft";
import { feedbackDueAt } from "@/lib/followup";
import { PAGE_SIZE } from "@/lib/limits";
import { analyzeEvidence, type EvidenceAnalysis } from "@/lib/match";
import { publicJobLinks } from "@/lib/public-links";
import { jobProvenance, safeExternalHttpUrl } from "@/lib/provenance";
import type { ApplicationStatus, Job } from "@/lib/types";
import { usePranchetaStore } from "../store-provider";

const EXAMPLE_JOB = `Exemplo de anúncio
Frontend júnior remoto. React, TypeScript e Golang.`;

export function VagasClient() {
  const { store, setStore } = usePranchetaStore();
  const [requisitos, setRequisitos] = useState("");
  const [jobDraft, setJobDraft] = useState({ title: "", company: "", url: "", text: "" });
  const [fonteInput, setFonteInput] = useState("");
  const [fonteMsg, setFonteMsg] = useState("");
  const [fonteBusy, setFonteBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [jobMsg, setJobMsg] = useState("");
  const [histMsg, setHistMsg] = useState("");
  const [jobPage, setJobPage] = useState(0);

  function setPortfolioUseConfirmation(projectId: string, term: string, confirmed: boolean) {
    setStore((current) => ({
      ...current,
      profile: {
        ...current.profile,
        projects: current.profile.projects.map((project) => project.id !== projectId ? project : {
          ...project,
          confirmedSkills: confirmed
            ? [...new Set([...(project.confirmedSkills || []), term])]
            : (project.confirmedSkills || []).filter((skill) => skill !== term),
        }),
      },
    }));
  }

  const selected = store.jobs.find((j) => j.id === selectedId) ?? null;
  const match: EvidenceAnalysis | null = useMemo(() => {
    const text = selected?.text || jobDraft.text;
    if (!store.profile.cvText || !text) return null;
    return analyzeEvidence(
      store.profile.cvText,
      text,
      requisitos.split("\n").map((l) => l.trim()).filter(Boolean),
      store.profile,
    );
  }, [selected, jobDraft.text, store.profile.cvText, store.profile.portfolioUrl, store.profile.projects, requisitos]);

  const draft = match
    ? draftMessage({
        profile: store.profile,
        jobTitle: selected?.title || jobDraft.title || "vaga",
        company: selected?.company || jobDraft.company,
        jobUrl: selected?.url || jobDraft.url,
        match,
      })
    : null;

  const publicLinks = publicJobLinks({
    title: selected?.title || jobDraft.title,
    company: selected?.company || jobDraft.company,
    url: selected?.url || jobDraft.url,
  });

  function addManualJob() {
    if (!jobDraft.title.trim() || !jobDraft.text.trim()) {
      setJobMsg("Preencha o título e o texto do anúncio para guardar a vaga.");
      return;
    }
    const url = safeExternalHttpUrl(jobDraft.url);
    if (jobDraft.url.trim() && !url) {
      setJobMsg("O link precisa ser um endereço http(s) válido, sem usuário ou senha. Não buscamos o conteúdo do link.");
      return;
    }
    setJobMsg("");
    const job: Job = {
      id: crypto.randomUUID(),
      title: jobDraft.title.trim(),
      company: jobDraft.company.trim(),
      url: url || "",
      location: "",
      text: jobDraft.text.trim(),
      source: "manual",
      addedAt: new Date().toISOString(),
    };
    setStore((s) => ({ ...s, jobs: [job, ...s.jobs] }));
    setSelectedId(job.id);
    setJobDraft({ title: "", company: "", url: "", text: "" });
  }

  async function importFonte() {
    if (!fonteInput.trim()) {
      setFonteMsg("Informe Greenhouse, remotar, lever:quadro, ou cole o anúncio.");
      return;
    }
    setFonteBusy(true);
    setFonteMsg("");
    try {
      const res = await fetch("/api/fontes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: fonteInput }),
      });
      const data = (await res.json()) as {
        source?: "greenhouse" | "remotar" | "lever";
        error?: string;
        total?: number;
        capped?: boolean;
        note?: string;
        jobs?: Array<{ title: string; company: string; url: string; location: string; text: string; source: "greenhouse" | "remotar" | "lever" }>;
      };
      if (!res.ok) {
        setFonteMsg(data.error ?? "Não foi possível importar.");
        return;
      }
      const jobs: Job[] = (data.jobs ?? []).map((j) => ({
        id: crypto.randomUUID(),
        title: j.title,
        company: j.company,
        url: safeExternalHttpUrl(j.url) || "",
        location: j.location,
        text: j.text,
        source: j.source,
        addedAt: new Date().toISOString(),
      }));
      setStore((s) => ({ ...s, jobs: [...jobs, ...s.jobs] }));
      setJobPage(0);
      const extra = data.capped && data.source === "lever"
        ? ` ${data.note ?? "Lista limitada; o quadro pode ter outras vagas."}`
        : data.capped
          ? ` A fonte tem ${data.total} vagas; mostramos as ${jobs.length} primeiras.`
          : "";
      setFonteMsg(`${jobs.length} vaga(s) públicas importadas.${extra} Nada foi enviado.`);
    } catch {
      setFonteMsg("Falha de rede. Tente de novo ou cole o anúncio.");
    } finally {
      setFonteBusy(false);
    }
  }

  function register(status: ApplicationStatus) {
    const title = selected?.title || jobDraft.title;
    const company = selected?.company || jobDraft.company;
    const url = selected?.url || jobDraft.url;
    const blocked = canRegister(title);
    if (blocked) {
      setHistMsg(blocked);
      return;
    }
    setHistMsg("");
    const now = new Date().toISOString();
    setStore((s) => ({
      ...s,
      applications: upsertApplication(s.applications, {
        jobId: selected?.id ?? "",
        title,
        company,
        url,
        source: selected?.source ?? "manual",
        jobAddedAt: selected?.addedAt,
        status,
        appliedAt: status === "candidatou" ? now : null,
        notes: "",
        feedbackDueAt: status === "candidatou" ? feedbackDueAt(now) : null,
      }),
    }));
  }

  return (
    <>
      <section className="paper">
        <h2>Vagas</h2>
        <p className="muted">
          Listas públicas Greenhouse, Remotar e Lever. LinkedIn continua bloqueado.
        </p>
        <p className="muted">
          Lever exige o identificador do quadro; não pesquisa todas as empresas e o nome do quadro não é verificado.
        </p>
        <label htmlFor="fonte">Greenhouse (token/URL), remotar ou lever:quadro</label>
        <input
          id="fonte"
          value={fonteInput}
          onChange={(e) => setFonteInput(e.target.value)}
          placeholder="ex.: stripe, remotar ou lever:acme"
        />
        <button type="button" disabled={fonteBusy} onClick={importFonte}>
          {fonteBusy ? "Buscando…" : "Importar lista pública"}
        </button>
        {fonteMsg ? (
          <p
            className={
              fonteMsg.includes("LinkedIn") || fonteMsg.toLowerCase().includes("não")
                ? "error-summary bad"
                : "muted"
            }
            role={fonteMsg.includes("LinkedIn") || fonteMsg.toLowerCase().includes("não") ? "alert" : undefined}
          >
            {fonteMsg}
          </p>
        ) : null}

        <label htmlFor="jt">Título do anúncio</label>
        <input id="jt" value={jobDraft.title} onChange={(e) => setJobDraft({ ...jobDraft, title: e.target.value })} />
        <label htmlFor="jc">Empresa</label>
        <input id="jc" value={jobDraft.company} onChange={(e) => setJobDraft({ ...jobDraft, company: e.target.value })} />
        <label htmlFor="ju">URL do anúncio</label>
        <input id="ju" value={jobDraft.url} onChange={(e) => setJobDraft({ ...jobDraft, url: e.target.value })} />
        <label htmlFor="jx">Texto do anúncio</label>
        <textarea id="jx" value={jobDraft.text} onChange={(e) => setJobDraft({ ...jobDraft, text: e.target.value })} />
        <label htmlFor="req">Requisitos (um por linha, opcional)</label>
        <textarea
          id="req"
          style={{ minHeight: "4rem" }}
          value={requisitos}
          onChange={(e) => setRequisitos(e.target.value)}
        />
        {jobMsg ? (
          <p className="error-summary bad" role="alert">
            {jobMsg}
          </p>
        ) : null}
        <button type="button" onClick={addManualJob}>
          Guardar vaga na lista
        </button>
        <button
          className="sec"
          type="button"
          onClick={() =>
            setJobDraft({
              title: "Frontend júnior",
              company: "Empresa Exemplo",
              url: "https://example.com/vaga",
              text: EXAMPLE_JOB,
            })
          }
        >
          Preencher anúncio de exemplo
        </button>
      </section>

      <section className="paper" style={{ marginTop: "1.5rem" }}>
        <h2>Comparação e atalhos públicos</h2>
        {!store.profile.cvText ? (
          <p className="bad">Sem o texto do currículo não dá para comparar.</p>
        ) : null}
        {!match ? (
          <p className="muted">
            {store.jobs.length
              ? "Escolha uma vaga da lista para comparar com o currículo."
              : "Nenhuma vaga ainda. Cole o texto da vaga."}
          </p>
        ) : (
          <>
            <p className="muted" role="status">
              Cobertura textual {match.coverage.either}/{match.coverage.job} (CV {match.coverage.cv}, menções no
              portfólio {match.coverage.portfolio}; uso confirmado por você {match.inPortfolio.length}). Não é ATS.
            </p>
            <h3 id="evid-cv">No currículo</h3>
            <ul className="list" aria-labelledby="evid-cv">
              <li className="ok">
                {match.present.length ? match.present.join(", ") : "nenhuma palavra técnica desta vaga no CV"}
              </li>
            </ul>
            <h3 id="evid-port">Menções nas descrições do portfólio (não copiadas para o CV)</h3>
            <p className="muted">Uma palavra encontrada na descrição não comprova autoria, uso ou nível de domínio.</p>
            {match.portfolioMentions.length ? (
              <ul className="list" aria-labelledby="evid-port">
                {match.portfolioMentions.map((mention) => {
                  const projectUrl = safeExternalHttpUrl(mention.projectUrl);
                  return <li key={`${mention.projectId}-${mention.term}`}>
                    <strong>{mention.term}</strong> — menção no texto, não verificada. Projeto: {mention.projectName}.
                    <blockquote>“{mention.quote}”</blockquote>
                    {projectUrl ? (
                      <p>
                        <a href={projectUrl} target="_blank" rel="noopener noreferrer">
                          Abrir link informado do projeto (não verificado)
                        </a>
                      </p>
                    ) : null}
                    {mention.confirmed ? (
                      <>
                        <p role="status">Você confirmou que usou {mention.term} neste projeto.</p>
                        <button
                          className="sec"
                          type="button"
                          onClick={() => setPortfolioUseConfirmation(mention.projectId, mention.term, false)}
                        >
                          Remover confirmação
                        </button>
                      </>
                    ) : mention.confirmable ? (
                      <button
                        className="sec"
                        type="button"
                        onClick={() => setPortfolioUseConfirmation(mention.projectId, mention.term, true)}
                      >
                        Confirmo que usei {mention.term} neste projeto
                      </button>
                    ) : (
                      <p className="muted" role="status">
                        A frase parece negativa ou hipotética; edite a descrição com uma afirmação verdadeira antes de confirmar.
                      </p>
                    )}
                  </li>;
                })}
              </ul>
            ) : (
              <p className="muted">Nenhum requisito apareceu só nos projetos descritos.</p>
            )}
            <h3 id="evid-falta">Em nenhum dos dois textos</h3>
            <ul className="list" aria-labelledby="evid-falta">
              <li className={match.missingEverywhere.length ? "bad" : "muted"}>
                {match.missingEverywhere.length ? match.missingEverywhere.join(", ") : "nada nesta lista"}
              </li>
            </ul>
            <p className="muted">“Não encontrado” descreve apenas os textos comparados; não significa que você não tenha essa experiência.</p>
            <p className="muted">{match.note}</p>
          </>
        )}
        {publicLinks.length ? (
          <ul className="list">
            {publicLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} rel="noreferrer" target="_blank">
                  {link.label}
                </a>
                <span className="muted"> — {link.note}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">
            {store.jobs.length
              ? "Selecione uma vaga para ver os atalhos públicos (anúncio + Google)."
              : "Sem URL nem empresa/título, não inventamos link de recrutador."}
          </p>
        )}
        {store.jobs.length ? (
          <p className="muted">
            {store.jobs.length} vaga(s). Página {jobPage + 1} de {Math.max(1, Math.ceil(store.jobs.length / PAGE_SIZE))}.
          </p>
        ) : null}
        <ul className="list">
          {store.jobs.slice(jobPage * PAGE_SIZE, jobPage * PAGE_SIZE + PAGE_SIZE).map((j) => {
            const url = safeExternalHttpUrl(j.url);
            return <li key={j.id}>
              <button className="sec" type="button" onClick={() => setSelectedId(j.id)}>
                {j.title} — {j.company}
              </button>
              <p className="muted">{jobProvenance(j.source, j.addedAt)}. A origem e o texto não são validados pela Prancheta.</p>
              {url ? (
                <a href={url} target="_blank" rel="noopener noreferrer">
                  Abrir anúncio indicado
                </a>
              ) : <span className="muted">Sem link http(s) utilizável.</span>}
            </li>;
          })}
        </ul>
        {store.jobs.length > PAGE_SIZE ? (
          <p>
            <button className="sec" type="button" disabled={jobPage === 0} onClick={() => setJobPage((p) => Math.max(0, p - 1))}>
              Página anterior
            </button>
            <button
              className="sec"
              type="button"
              disabled={(jobPage + 1) * PAGE_SIZE >= store.jobs.length}
              onClick={() => setJobPage((p) => p + 1)}
            >
              Próxima página
            </button>
          </p>
        ) : null}
      </section>

      <section className="paper" style={{ marginTop: "1.5rem" }}>
        <h2>Rascunho (envio manual)</h2>
        {draft ? (
          <>
            <div className="draft">{draft.body}</div>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(draft.body);
                setCopied(true);
              }}
            >
              Copiar
            </button>
            {copied ? <span className="ok"> Copiado. O envio continua com você.</span> : null}
          </>
        ) : (
          <p className="muted">O rascunho aparece depois da comparação.</p>
        )}
        {histMsg ? (
          <p className="error-summary bad" role="alert">
            {histMsg}
          </p>
        ) : null}
        <div className="actions">
          <button type="button" onClick={() => register("rascunho")}>
            Registrar rascunho
          </button>
          <button type="button" onClick={() => register("candidatou")}>
            Marquei que me candidatei (fora daqui)
          </button>
        </div>
      </section>
    </>
  );
}
