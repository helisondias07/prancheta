"use client";

import { useState } from "react";
import { safeExternalHttpUrl } from "@/lib/provenance";
import { usePranchetaStore } from "../store-provider";
import { PortfolioExcerpt } from "./portfolio-excerpt";

export function PortfolioClient() {
  const { store, setStore } = usePranchetaStore();
  const [proj, setProj] = useState({ name: "", url: "", whatIDid: "" });
  const [projMsg, setProjMsg] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  function addProject() {
    if (!proj.name.trim() || !proj.whatIDid.trim()) {
      setProjMsg("Preencha o nome do projeto e o que você fez. Não usamos janela de prompt.");
      return;
    }
    const url = safeExternalHttpUrl(proj.url);
    if (proj.url.trim() && !url) {
      setProjMsg("O link precisa ser um endereço http(s) válido, sem usuário ou senha. Não buscamos o conteúdo do link.");
      return;
    }
    const description = proj.whatIDid.trim();
    setStore((s) => ({
      ...s,
      profile: {
        ...s.profile,
        projects: editingId ? s.profile.projects.map((p) => p.id !== editingId ? p : {
          ...p, name: proj.name.trim(), url: url || "", whatIDid: description,
          ...(p.whatIDid !== description ? { confirmedSkills: [], confirmedSkillDescriptions: undefined } : {}),
        }) : [...s.profile.projects, { id: crypto.randomUUID(), name: proj.name.trim(), url: url || "", whatIDid: description }],
      },
    }));
    setProj({ name: "", url: "", whatIDid: "" });
    setStatus(editingId ? "Projeto atualizado. Se a descrição mudou, confirme o uso novamente na análise." : "Projeto acrescentado.");
    setEditingId(null);
    setProjMsg("");
  }

  return (
    <><section className="paper">
      <h2>Portfólio</h2>
      <p className="muted">Só o que você descrever. URLs são links informados por você; não buscamos nem verificamos o conteúdo.</p>
      <label htmlFor="port">URL do portfólio (opcional)</label>
      <input
        id="port"
        value={store.profile.portfolioUrl}
        onChange={(e) =>
          setStore((s) => ({ ...s, profile: { ...s.profile, portfolioUrl: e.target.value } }))
        }
      />
      {store.profile.projects.length === 0 ? (
        <p className="muted">Nenhum projeto cadastrado neste navegador.</p>
      ) : (
        store.profile.projects.map((p) => {
          const url = safeExternalHttpUrl(p.url);
          return <div key={p.id} className="row">
            <span style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {p.name} — {p.whatIDid}{" "}
              {url ? (
                <a href={url} rel="noopener noreferrer" target="_blank">
                  Abrir link informado
                </a>
              ) : p.url ? <span className="muted">Link não HTTP(S): {p.url}</span> : null}
            </span>
            <button className="sec" type="button" onClick={() => { setEditingId(p.id); setProj({ name: p.name, url: p.url, whatIDid: p.whatIDid }); setProjMsg(""); setStatus(""); document.getElementById("proj-nome")?.focus(); }} aria-label={`Editar projeto ${p.name}`}>
              Editar
            </button>
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
          </div>;
        })
      )}
      {editingId ? <p>Alterar a descrição remove as confirmações de uso deste projeto.</p> : null}
      <label htmlFor="proj-nome">Nome do projeto</label>
      <input id="proj-nome" value={proj.name} onChange={(e) => setProj({ ...proj, name: e.target.value })} />
      <label htmlFor="proj-url">URL do projeto (opcional)</label>
      <input id="proj-url" type="url" value={proj.url} onChange={(e) => setProj({ ...proj, url: e.target.value })} />
      <label htmlFor="proj-feito">O que você fez (fato)</label>
      <textarea
        id="proj-feito"
        value={proj.whatIDid}
        onChange={(e) => setProj({ ...proj, whatIDid: e.target.value })}
      />
      {projMsg ? (
        <p className="error-summary bad" role="alert">
          {projMsg}
        </p>
      ) : null}
      {status ? <p role="status">{status}</p> : null}
      <button className="sec" type="button" onClick={addProject}>
        {editingId ? "Salvar alterações" : "Acrescentar projeto"}
      </button>
      {editingId ? <button className="sec" type="button" onClick={() => { setEditingId(null); setProj({ name: "", url: "", whatIDid: "" }); setProjMsg(""); }}>Cancelar edição</button> : null}
    </section><PortfolioExcerpt /></>
  );
}
