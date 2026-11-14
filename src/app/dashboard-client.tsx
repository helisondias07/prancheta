"use client";

import { dashboardSnapshot } from "@/lib/dashboard";
import { wipeStore } from "@/lib/storage";
import { MAX_BACKUP_BYTES, parseBackup, serializeBackup } from "@/lib/backup";
import { emptyStore, type Store } from "@/lib/types";
import { useState } from "react";
import { usePranchetaStore } from "./store-provider";

export function DashboardClient() {
  const { store, setStore } = usePranchetaStore();
  const [wipeOnce, setWipeOnce] = useState(false);
  const [backupPreview, setBackupPreview] = useState<Store | null>(null);
  const [backupMessage, setBackupMessage] = useState("");
  const snap = dashboardSnapshot(store);

  async function readBackup(file?: File) {
    setBackupPreview(null);
    setBackupMessage("");
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) {
      setBackupMessage("O arquivo excede o limite de 5 MB. Seus dados atuais continuam intactos.");
      return;
    }
    try {
      const result = parseBackup(await file.text());
      if (!result.ok) {
        setBackupMessage(result.message);
        return;
      }
      setBackupPreview(result.store);
      setBackupMessage(`Backup válido: ${result.store.jobs.length} vagas, ${result.store.profile.projects.length} projetos e ${result.store.applications.length} registros.`);
    } catch {
      setBackupMessage("Não foi possível ler esse arquivo. Seus dados atuais continuam intactos.");
    }
  }

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
          <p className="muted" style={{ marginTop: "0.8rem" }} role="status">
            Vaga mais recente: CV {snap.latestMatch.coverage.cv}/{snap.latestMatch.coverage.job}, portfólio{" "}
            {snap.latestMatch.coverage.portfolio}/{snap.latestMatch.coverage.job}, em nenhum{" "}
            {snap.latestMatch.missingEverywhere.length}. Não é nota ATS.
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
          Já funciona: CV × vaga × portfólio cadastrado (não é ATS); PDF.js local (incompleto não preenche; scan falha); portfólio que você
          cadastra; Greenhouse/Remotar públicos; Kanban local; D+7; rascunho para copiar; dois atalhos
          públicos (anúncio + Google).
        </p>
      </section>

      <section className="paper" style={{ marginTop: "1.5rem" }}>
        <h2>Dados neste aparelho</h2>
        <button
          className="sec"
          type="button"
          onClick={() => {
            const content = serializeBackup(store);
            if (new TextEncoder().encode(content).byteLength > MAX_BACKUP_BYTES) {
              setBackupMessage("Os dados excedem 5 MB e não podem ser exportados por este recurso.");
              return;
            }
            const blob = new Blob([content], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "prancheta-export.json";
            a.click();
            window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
          }}
        >
          Exportar JSON
        </button>
        <p className="muted">O backup inclui currículo e anotações. O arquivo não é criptografado; guarde-o em local privado. Nada é enviado ao servidor.</p>
        <label htmlFor="backup-json">Restaurar backup JSON (até 5 MB)</label>
        <input
          id="backup-json"
          type="file"
          accept="application/json,.json"
          onChange={(event) => void readBackup(event.currentTarget.files?.[0])}
        />
        {backupMessage ? <p className="muted" role="status">{backupMessage}</p> : null}
        {backupPreview ? (
          <>
            <p className="warn">Restaurar substituirá currículo, projetos, vagas e histórico atuais deste navegador.</p>
            <button
              className="sec"
              type="button"
              onClick={() => {
                setStore(backupPreview);
                setBackupPreview(null);
                setBackupMessage("Backup restaurado neste navegador. Nenhum arquivo foi enviado.");
              }}
            >
              Substituir dados pelos do backup
            </button>
          </>
        ) : null}
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
