"use client";

import { useMemo, useState } from "react";
import { canRegister, upsertApplication } from "@/lib/applications";
import { draftMessage } from "@/lib/draft";
import { feedbackDueAt } from "@/lib/followup";
import { PAGE_SIZE } from "@/lib/limits";
import { matchCvToJob, type MatchResult } from "@/lib/match";
import { publicJobLinks } from "@/lib/public-links";
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

  const selected = store.jobs.find((j) => j.id === selectedId) ?? null;
  const match: MatchResult | null = useMemo(() => {
    const text = selected?.text || jobDraft.text;
    if (!store.profile.cvText || !text) return null;
    return matchCvToJob(
      store.profile.cvText,
      text,
      requisitos.split("\n").map((l) => l.trim()).filter(Boolean),
    );
  }, [selected, jobDraft.text, store.profile.cvText, requisitos]);

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
    setJobMsg("");
    const job: Job = {
      id: crypto.randomUUID(),
      title: jobDraft.title.trim(),
      company: jobDraft.company.trim(),
      url: jobDraft.url.trim(),
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
      setFonteMsg("Informe o token Greenhouse (ex.: stripe), remotar, ou cole o anúncio.");
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
        error?: string;
        total?: number;
        capped?: boolean;
        jobs?: Array<{ title: string; company: string; url: string; location: string; text: string; source: "greenhouse" | "remotar" }>;
      };
      if (!res.ok) {
        setFonteMsg(data.error ?? "Não foi possível importar.");
        return;
      }
      const jobs: Job[] = (data.jobs ?? []).map((j) => ({
        id: crypto.randomUUID(),
        title: j.title,
        company: j.company,
        url: j.url,
        location: j.location,
        text: j.text,
        source: j.source,
        addedAt: new Date().toISOString(),
      }));
      setStore((s) => ({ ...s, jobs: [...jobs, ...s.jobs] }));
      setJobPage(0);
      const extra = data.capped
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
          Dados reais só de quadro público Greenhouse ou Remotar. LinkedIn continua bloqueado.
        </p>
        <label htmlFor="fonte">Greenhouse (token ou URL) ou “remotar”</label>
        <input
          id="fonte"
          value={fonteInput}
          onChange={(e) => setFonteInput(e.target.value)}
          placeholder="ex.: stripe ou remotar"
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
            <p className="ok">
              O que o CV mostra: {match.present.length ? match.present.join(", ") : "nenhuma palavra técnica desta vaga"}
            </p>
            <p className={match.missing.length ? "bad" : "muted"}>
              O que a vaga pede e o CV não traz: {match.missing.length ? match.missing.join(", ") : "nada nesta lista"}
            </p>
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
          {store.jobs.slice(jobPage * PAGE_SIZE, jobPage * PAGE_SIZE + PAGE_SIZE).map((j) => (
            <li key={j.id}>
              <button className="sec" type="button" onClick={() => setSelectedId(j.id)}>
                {j.title} — {j.company}
              </button>
            </li>
          ))}
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
        <div>
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
