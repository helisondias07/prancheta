"use client";

import { useState } from "react";
import { safeExternalHttpUrl } from "@/lib/provenance";
import { usePranchetaStore } from "../store-provider";

export function PortfolioClient() {
  const { store, setStore } = usePranchetaStore();
  const [proj, setProj] = useState({ name: "", url: "", whatIDid: "" });
  const [projMsg, setProjMsg] = useState("");

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
    setStore((s) => ({
      ...s,
      profile: {
        ...s.profile,
        projects: [
          ...s.profile.projects,
          { id: crypto.randomUUID(), name: proj.name.trim(), url: url || "", whatIDid: proj.whatIDid.trim() },
        ],
      },
    }));
    setProj({ name: "", url: "", whatIDid: "" });
    setProjMsg("");
  }

  return (
    <section className="paper">
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
            <span>
              {p.name} — {p.whatIDid}{" "}
              {url ? (
                <a href={url} rel="noopener noreferrer" target="_blank">
                  Abrir link informado
                </a>
              ) : p.url ? <span className="muted">Link não HTTP(S): {p.url}</span> : null}
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
          </div>;
        })
      )}
      <label htmlFor="proj-nome">Nome do projeto</label>
      <input id="proj-nome" value={proj.name} onChange={(e) => setProj({ ...proj, name: e.target.value })} />
      <label htmlFor="proj-url">URL do projeto (opcional)</label>
      <input id="proj-url" type="url" value={proj.url} onChange={(e) => setProj({ ...proj, url: e.target.value })} />
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
    </section>
  );
}
