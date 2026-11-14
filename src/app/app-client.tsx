"use client";

import { useEffect, useMemo, useState } from "react";
import { draftMessage } from "@/lib/draft";
import { isFeedbackDue, feedbackDueAt } from "@/lib/followup";
import { matchCvToJob, type MatchResult } from "@/lib/match";
import { loadStore, saveStore, wipeStore } from "@/lib/storage";
import type { Application, ApplicationStatus, Job, Store } from "@/lib/types";
import { emptyStore } from "@/lib/types";

const EXAMPLE_CV = `Exemplo (não é uma pessoa real)
Ana Costa — desenvolvedora frontend.
React, TypeScript, HTML, CSS, testes com Vitest.
Projeto: loja de demonstração em Next.js.`;

const EXAMPLE_JOB = `Exemplo de anúncio
Frontend júnior remoto. React, TypeScript e Golang.`;

export function AppClient() {
  const [store, setStore] = useState<Store>(emptyStore);
  const [ready, setReady] = useState(false);
  const [requisitos, setRequisitos] = useState("");
  const [jobDraft, setJobDraft] = useState({ title: "", company: "", url: "", text: "" });
  const [fonteInput, setFonteInput] = useState("");
  const [fonteMsg, setFonteMsg] = useState("");
  const [fonteBusy, setFonteBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setStore(loadStore());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveStore(store);
  }, [store, ready]);

  const selected = store.jobs.find((j) => j.id === selectedId) ?? null;
  const match: MatchResult | null = useMemo(() => {
    if (!selected && !jobDraft.text && !store.profile.cvText) return null;
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

  function addManualJob() {
    if (!jobDraft.title.trim() || !jobDraft.text.trim()) return;
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
      setFonteMsg(`${jobs.length} vaga(s) públicas importadas. Nada foi enviado.`);
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
    if (!title) return;
    const now = new Date().toISOString();
    const app: Application = {
      id: crypto.randomUUID(),
      jobId: selected?.id ?? "",
      title,
      company,
      url,
      status,
      appliedAt: status === "candidatou" ? now : null,
      notes: "",
      feedbackDueAt: status === "candidatou" ? feedbackDueAt(now) : null,
    };
    setStore((s) => ({ ...s, applications: [app, ...s.applications] }));
  }

  function loadExample() {
    setStore((s) => ({
      ...s,
      profile: {
        ...s.profile,
        displayName: "Ana Costa",
        headline: "Frontend (exemplo)",
        cvText: EXAMPLE_CV,
        projects: [
          {
            id: crypto.randomUUID(),
            name: "Loja demo",
            url: "https://example.com",
            whatIDid: "Páginas de produto em Next.js",
          },
        ],
      },
    }));
    setJobDraft({
      title: "Frontend júnior",
      company: "Empresa Exemplo",
      url: "https://example.com/vaga",
      text: EXAMPLE_JOB,
    });
  }

  if (!ready) {
    return (
      <div className="wrap">
        <p className="muted">Abrindo a prancheta neste navegador…</p>
      </div>
    );
  }

  return (
    <div className="wrap">
      <header className="site">
        <div>
          <h1>Prancheta</h1>
          <p className="lede">
            Compare o que você já escreveu no currículo com o texto da vaga. Esta página não se candidata,
            não manda e-mail e não inventa experiência.
          </p>
        </div>
        <nav>
          <a href="/privacidade">Privacidade</a>
          <a href="https://github.com/helisondias07/prancheta">Código</a>
        </nav>
      </header>

      <p className="banner" role="note">
        Dados ficam só neste navegador (LGPD: você pode exportar ou apagar tudo). Fontes vivas: quadro
        público Greenhouse e API pública Remotar. LinkedIn não é importado.
      </p>

      <div className="grid two" style={{ marginTop: "1.5rem" }}>
        <section className="paper">
          <h2>1. Seu material</h2>
          <label htmlFor="nome">Nome como você quer aparecer no rascunho</label>
          <input
            id="nome"
            value={store.profile.displayName}
            onChange={(e) =>
              setStore((s) => ({ ...s, profile: { ...s.profile, displayName: e.target.value } }))
            }
          />
          <label htmlFor="cv">Texto do currículo (cole você; não usamos PDF da sua máquina)</label>
          <textarea
            id="cv"
            value={store.profile.cvText}
            onChange={(e) =>
              setStore((s) => ({ ...s, profile: { ...s.profile, cvText: e.target.value } }))
            }
          />
          <label htmlFor="port">URL do portfólio (opcional)</label>
          <input
            id="port"
            value={store.profile.portfolioUrl}
            onChange={(e) =>
              setStore((s) => ({ ...s, profile: { ...s.profile, portfolioUrl: e.target.value } }))
            }
          />
          <p className="muted">Projetos: só o que você descrever. Vazio é honesto.</p>
          {store.profile.projects.map((p) => (
            <div key={p.id} className="row">
              <span>
                {p.name} — {p.whatIDid}{" "}
                {p.url ? (
                  <a href={p.url} rel="noreferrer">
                    {p.url}
                  </a>
                ) : null}
              </span>
              <button
                className="sec"
                type="button"
                onClick={() =>
                  setStore((s) => ({
                    ...s,
                    profile: { ...s.profile, projects: s.profile.projects.filter((x) => x.id !== p.id) },
                  }))
                }
              >
                Remover
              </button>
            </div>
          ))}
          <button
            className="sec"
            type="button"
            onClick={() => {
              const name = window.prompt("Nome do projeto");
              if (!name) return;
              const url = window.prompt("URL") ?? "";
              const whatIDid = window.prompt("O que você fez (fato)") ?? "";
              if (!whatIDid) return;
              setStore((s) => ({
                ...s,
                profile: {
                  ...s.profile,
                  projects: [...s.profile.projects, { id: crypto.randomUUID(), name, url, whatIDid }],
                },
              }));
            }}
          >
            Acrescentar projeto
          </button>
          <button className="sec" type="button" onClick={loadExample}>
            Carregar dados de exemplo
          </button>
        </section>

        <section className="paper">
          <h2>2. A vaga</h2>
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
          {fonteMsg ? <p className={fonteMsg.includes("LinkedIn") || fonteMsg.includes("não") ? "bad" : "muted"}>{fonteMsg}</p> : null}

          <label htmlFor="jt">Ou cole um anúncio</label>
          <input
            id="jt"
            placeholder="Título"
            value={jobDraft.title}
            onChange={(e) => setJobDraft({ ...jobDraft, title: e.target.value })}
          />
          <input
            placeholder="Empresa"
            value={jobDraft.company}
            onChange={(e) => setJobDraft({ ...jobDraft, company: e.target.value })}
          />
          <input
            placeholder="URL (você copia; não abrimos sessão em site de login)"
            value={jobDraft.url}
            onChange={(e) => setJobDraft({ ...jobDraft, url: e.target.value })}
          />
          <textarea
            placeholder="Texto do anúncio"
            value={jobDraft.text}
            onChange={(e) => setJobDraft({ ...jobDraft, text: e.target.value })}
          />
          <label htmlFor="req">Requisitos (um por linha, opcional)</label>
          <textarea
            id="req"
            style={{ minHeight: "4rem" }}
            value={requisitos}
            onChange={(e) => setRequisitos(e.target.value)}
          />
          <button type="button" onClick={addManualJob}>
            Guardar vaga na lista
          </button>
        </section>
      </div>

      <section className="paper" style={{ marginTop: "1.5rem" }}>
        <h2>3. Comparação</h2>
        {!match ? (
          <p className="muted">Cole currículo e vaga para ver a cobertura. Estado vazio é o esperado.</p>
        ) : (
          <>
            <p>
              Cobertura: <strong>{match.score}%</strong> das {match.compared} palavras técnicas comparadas.
            </p>
            <p className="muted">{match.note}</p>
            {match.present.length ? (
              <p className="ok">No currículo: {match.present.join(", ")}</p>
            ) : null}
            {match.missing.length ? (
              <p className="bad">Só na vaga (não acrescentamos): {match.missing.join(", ")}</p>
            ) : null}
          </>
        )}
        {selected ? (
          <p className="muted">
            Vaga selecionada: {selected.title} ({selected.source})
          </p>
        ) : null}
        <ul className="list">
          {store.jobs.slice(0, 20).map((j) => (
            <li key={j.id}>
              <button className="sec" type="button" onClick={() => setSelectedId(j.id)}>
                {j.title} — {j.company}
              </button>{" "}
              {j.url ? (
                <a href={j.url} rel="noreferrer">
                  abrir
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="paper" style={{ marginTop: "1.5rem" }}>
        <h2>4. Rascunho de mensagem (envio manual)</h2>
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
        <div>
          <button type="button" onClick={() => register("rascunho")}>
            Registrar rascunho
          </button>
          <button type="button" onClick={() => register("candidatou")}>
            Marquei que me candidatei (fora daqui)
          </button>
        </div>
      </section>

      <section className="paper" style={{ marginTop: "1.5rem" }}>
        <h2>5. Histórico</h2>
        {store.applications.length === 0 ? (
          <p className="muted">Nenhuma candidatura registrada neste navegador.</p>
        ) : (
          store.applications.map((a) => (
            <div key={a.id} className="row">
              <div>
                <span className="tag">{a.status}</span> {a.title} {a.company ? `· ${a.company}` : ""}
                {a.appliedAt ? (
                  <div className="muted">
                    {new Date(a.appliedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (BRT)
                  </div>
                ) : null}
                {isFeedbackDue(a.appliedAt) && a.status === "candidatou" ? (
                  <p className="warn">Passaram 7 dias. Rascunhe um pedido de feedback — não enviamos.</p>
                ) : null}
              </div>
              <select
                aria-label={`Status de ${a.title}`}
                value={a.status}
                onChange={(e) => {
                  const status = e.target.value as ApplicationStatus;
                  setStore((s) => ({
                    ...s,
                    applications: s.applications.map((x) => (x.id === a.id ? { ...x, status } : x)),
                  }));
                }}
              >
                <option value="rascunho">rascunho</option>
                <option value="candidatou">candidatou</option>
                <option value="aguardando">aguardando</option>
                <option value="feedback-pedido">feedback-pedido</option>
                <option value="encerrada">encerrada</option>
              </select>
            </div>
          ))
        )}
      </section>

      <section className="paper" style={{ marginTop: "1.5rem" }}>
        <h2>Dados neste aparelho</h2>
        <button
          className="sec"
          type="button"
          onClick={() => {
            const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "prancheta-export.json";
            a.click();
          }}
        >
          Exportar JSON
        </button>
        <button
          className="sec"
          type="button"
          onClick={() => {
            if (window.confirm("Apagar currículo, vagas e histórico deste navegador?")) {
              wipeStore();
              setStore(emptyStore());
            }
          }}
        >
          Apagar tudo
        </button>
      </section>
    </div>
  );
}
