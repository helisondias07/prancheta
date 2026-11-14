"use client";

import { useEffect, useMemo, useState } from "react";
import { draftMessage } from "@/lib/draft";
import { isFeedbackDue, feedbackDueAt } from "@/lib/followup";
import { matchCvToJob, type MatchResult } from "@/lib/match";
import { canRegister, upsertApplication } from "@/lib/applications";
import { PAGE_SIZE } from "@/lib/limits";
import { loadStore, saveStore, wipeStore } from "@/lib/storage";
import type { ApplicationStatus, Job, Store } from "@/lib/types";
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
  const [proj, setProj] = useState({ name: "", url: "", whatIDid: "" });
  const [projMsg, setProjMsg] = useState("");
  const [jobMsg, setJobMsg] = useState("");
  const [histMsg, setHistMsg] = useState("");
  const [jobPage, setJobPage] = useState(0);
  const [wipeOnce, setWipeOnce] = useState(false);

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

  function addProject() {
    if (!proj.name.trim() || !proj.whatIDid.trim()) {
      setProjMsg("Preencha o nome do projeto e o que você fez. Não usamos janela de prompt.");
      return;
    }
    setStore((s) => ({
      ...s,
      profile: {
        ...s.profile,
        projects: [
          ...s.profile.projects,
          { id: crypto.randomUUID(), name: proj.name.trim(), url: proj.url.trim(), whatIDid: proj.whatIDid.trim() },
        ],
      },
    }));
    setProj({ name: "", url: "", whatIDid: "" });
    setProjMsg("");
  }

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
        note?: string;
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

  const dueCount = store.applications.filter(
    (a) => a.status === "candidatou" && isFeedbackDue(a.appliedAt),
  ).length;

  if (!ready) {
    return (
      <div className="wrap">
        <p className="muted">Abrindo o caderno neste navegador…</p>
      </div>
    );
  }

  return (
    <div className="wrap">
      <a className="skip" href="#conteudo">
        Ir para o conteúdo
      </a>
      <header className="site">
        <div>
          <h1>Prancheta</h1>
          <p className="lede">
            Guarde cada vaga. Veja o que falta no CV e no portfólio. No 7º dia, a gente te lembra. Esta
            página não se candidata, não manda e-mail e não inventa experiência.
          </p>
          <p className="muted">
            Hoje
            {dueCount ? ` · ${dueCount} no D+7` : " · nenhum D+7"}. Nome de marca provisório; não é registro.
          </p>
        </div>
        <nav>
          <a href="/privacidade">Privacidade</a>
          <a href="https://github.com/helisondias07/prancheta">Código</a>
        </nav>
      </header>

      <p className="banner" role="note">
        Dados ficam só neste navegador (LGPD: você pode exportar ou apagar tudo). Fontes vivas: quadro
        público Greenhouse e API pública Remotar. LinkedIn não é importado. Hospedagem atual: Vercel
        Hobby — <strong>uso pessoal ou não comercial</strong> (
        <a href="https://vercel.com/legal/terms">Termos §4</a>
        ). Não há pagamento aqui.
      </p>
      <div id="conteudo">
      <section className="paper" style={{ marginTop: "1.5rem" }} aria-labelledby="limites">
        <h2 id="limites">O que isto faz agora — e o que não faz</h2>
        <p>
          Compara o <strong>texto que você cola</strong> com o anúncio, guarda um histórico local e
          rascunha uma mensagem para <strong>você</strong> enviar. Não é ATS, não é garantia de
          entrevista e não envia nada.
        </p>
        <ul className="list">
          <li>
            <strong>Já funciona:</strong> palavras técnicas CV × vaga; portfólio que você cadastra;
            colar anúncio ou importar Greenhouse/Remotar públicos; status manual; lembrete D+7 neste
            aparelho; copiar rascunho; exportar/apagar.
          </li>
          <li>
            <strong>Ainda não:</strong> ler PDF, conta/login, e-mail automático, dois links de
            recrutador, Kanban, análise por IA, Pix/assinatura, LinkedIn.
          </li>
        </ul>
      </section>

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
          <label htmlFor="proj-nome">Nome do projeto</label>
          <input
            id="proj-nome"
            value={proj.name}
            onChange={(e) => setProj({ ...proj, name: e.target.value })}
          />
          <label htmlFor="proj-url">URL do projeto (opcional)</label>
          <input
            id="proj-url"
            value={proj.url}
            onChange={(e) => setProj({ ...proj, url: e.target.value })}
          />
          <label htmlFor="proj-feito">O que você fez (fato)</label>
          <input
            id="proj-feito"
            value={proj.whatIDid}
            onChange={(e) => setProj({ ...proj, whatIDid: e.target.value })}
          />
          {projMsg ? (
            <p className="error-summary bad" role="alert">
              {projMsg}
            </p>
          ) : null}
          <button className="sec" type="button" onClick={addProject}>
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
          <input
            id="jt"
            value={jobDraft.title}
            onChange={(e) => setJobDraft({ ...jobDraft, title: e.target.value })}
          />
          <label htmlFor="jc">Empresa</label>
          <input
            id="jc"
            value={jobDraft.company}
            onChange={(e) => setJobDraft({ ...jobDraft, company: e.target.value })}
          />
          <label htmlFor="ju">URL do anúncio (você copia; não abrimos sessão em site de login)</label>
          <input
            id="ju"
            value={jobDraft.url}
            onChange={(e) => setJobDraft({ ...jobDraft, url: e.target.value })}
          />
          <label htmlFor="jx">Texto do anúncio</label>
          <textarea
            id="jx"
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
          {jobMsg ? (
            <p className="error-summary bad" role="alert">
              {jobMsg}
            </p>
          ) : null}
          <button type="button" onClick={addManualJob}>
            Guardar vaga na lista
          </button>
        </section>
      </div>

      <section className="paper" style={{ marginTop: "1.5rem" }}>
        <h2>3. Comparação</h2>
        {!store.profile.cvText ? (
          <p className="bad">Sem o texto do currículo não dá para comparar.</p>
        ) : null}
        {!match ? (
          <p className="muted">Nenhuma vaga ainda. Cole o texto da vaga.</p>
        ) : (
          <>
            <p className="ok">O que o CV mostra: {match.present.length ? match.present.join(", ") : "nenhuma palavra técnica desta vaga"}</p>
            <p className={match.missing.length ? "bad" : "muted"}>
              O que a vaga pede e o CV não traz: {match.missing.length ? match.missing.join(", ") : "nada nesta lista"}
            </p>
            <p className="muted">{match.note}</p>
            <p className="muted mono">
              {match.present.length} presentes · {match.missing.length} ausentes · {match.compared} comparadas
              {match.score != null ? ` · ${match.score}% só como conta, não como nota ATS` : ""}
            </p>
          </>
        )}
        {selected ? (
          <p className="muted">
            Vaga selecionada: {selected.title} ({selected.source})
          </p>
        ) : null}
        {store.jobs.length ? (
          <p className="muted">
            {store.jobs.length} vaga(s) na lista. Página {jobPage + 1} de{" "}
            {Math.max(1, Math.ceil(store.jobs.length / PAGE_SIZE))}.
          </p>
        ) : null}
        <ul className="list">
          {store.jobs.slice(jobPage * PAGE_SIZE, jobPage * PAGE_SIZE + PAGE_SIZE).map((j) => (
            <li key={j.id}>
              <button className="sec" type="button" onClick={() => setSelectedId(j.id)}>
                {j.title} — {j.company}
              </button>{" "}
              {j.url ? (
                <a href={j.url} rel="noreferrer" target="_blank">
                  abrir anúncio
                </a>
              ) : (
                <span className="muted">sem URL</span>
              )}
            </li>
          ))}
        </ul>
        {store.jobs.length > PAGE_SIZE ? (
          <p>
            <button
              className="sec"
              type="button"
              disabled={jobPage === 0}
              onClick={() => setJobPage((p) => Math.max(0, p - 1))}
            >
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
        <p className="muted">A mesma vaga vira uma linha só: rascunho depois enviada, sem duplicar.</p>
      </section>

      <section className="paper" style={{ marginTop: "1.5rem" }}>
        <h2>5. Histórico</h2>
        {store.applications.length === 0 ? (
          <p className="muted">Nenhuma candidatura registrada neste navegador.</p>
        ) : (
          store.applications.map((a) => (
            <div key={a.id} className="row">
              <div>
                <span className={`stamp ${stampClass(a.status, isFeedbackDue(a.appliedAt))}`}>
                  {stampLabel(a.status, isFeedbackDue(a.appliedAt))}
                </span>{" "}
                {a.title} {a.company ? `· ${a.company}` : ""}
                {a.appliedAt ? (
                  <div className="muted mono">
                    {new Date(a.appliedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (BRT)
                  </div>
                ) : null}
                {isFeedbackDue(a.appliedAt) && a.status === "candidatou" ? (
                  <p className="warn">Faz 7 dias. Quer um rascunho de follow-up? Você envia.</p>
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
            if (!wipeOnce) {
              setWipeOnce(true);
              return;
            }
            wipeStore();
            setStore(emptyStore());
            setWipeOnce(false);
          }}
        >
          {wipeOnce ? "Confirmar apagar tudo neste navegador" : "Apagar tudo"}
        </button>
      </section>
      </div>
    </div>
  );
}

function stampLabel(status: ApplicationStatus, due: boolean): string {
  if (due && status === "candidatou") return "D+7";
  if (status === "candidatou") return "enviada";
  if (status === "aguardando") return "silêncio";
  if (status === "feedback-pedido") return "follow-up";
  if (status === "encerrada") return "encerrada";
  return "rascunho";
}

function stampClass(status: ApplicationStatus, due: boolean): string {
  if (due && status === "candidatou") return "stamp-d7";
  if (status === "candidatou") return "stamp-enviada";
  if (status === "encerrada") return "stamp-encerrada";
  if (status === "aguardando") return "stamp-incerto";
  return "stamp-rascunho";
}
