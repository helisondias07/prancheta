"use client";

import { dashboardSnapshot } from "@/lib/dashboard";
import { wipeStore } from "@/lib/storage";
import { emptyStore } from "@/lib/types";
import { useState } from "react";
import { usePranchetaStore } from "./store-provider";

export function DashboardClient() {
  const { store, setStore } = usePranchetaStore();
  const [wipeOnce, setWipeOnce] = useState(false);
  const snap = dashboardSnapshot(store);

  return (
    <>
      <section className="paper">
        <h2>Dashboard</h2>
        <p>
          Números deste navegador. Não é um funil de ATS e não conta candidatura que você não marcou.
        </p>
        <div className="stats">
          <div className="stat">
            <strong>{snap.hasCv ? "sim" : "não"}</strong>
            currículo colado
          </div>
          <div className="stat">
            <strong>{snap.projectCount}</strong>
            projetos
          </div>
          <div className="stat">
            <strong>{snap.jobCount}</strong>
            vagas
          </div>
          <div className="stat">
            <strong>{snap.applicationCount}</strong>
            no histórico
          </div>
          <div className="stat">
            <strong>{snap.dueFollowups.length}</strong>
            D+7
          </div>
        </div>
        {snap.latestMatch ? (
          <p className="muted" style={{ marginTop: "0.8rem" }}>
            Comparação da vaga mais recente da lista: {snap.latestMatch.present.length} presentes,{" "}
            {snap.latestMatch.missing.length} ausentes. Não é nota ATS.
          </p>
        ) : (
          <p className="muted" style={{ marginTop: "0.8rem" }}>
            Sem comparação ainda — falta currículo ou vaga.
          </p>
        )}
        {snap.dueFollowups.length ? (
          <ul className="list">
            {snap.dueFollowups.map((a) => (
              <li key={a.id}>
                {a.title} {a.company ? `· ${a.company}` : ""} — faz 7 dias. Você envia o follow-up.
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="paper" style={{ marginTop: "1.5rem" }} aria-labelledby="lacunas">
        <h2 id="lacunas">O que falta — sem prometer</h2>
        <ul className="list">
          {snap.gaps.map((gap) => (
            <li key={gap}>{gap}</li>
          ))}
        </ul>
        <p className="muted">
          Já funciona: CV × vaga no texto; portfólio que você cadastra; Greenhouse/Remotar públicos;
          Kanban local; D+7; rascunho para copiar; dois atalhos públicos (anúncio + Google).
        </p>
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
    </>
  );
}
