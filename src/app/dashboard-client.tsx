"use client";

import { dashboardSnapshot } from "@/lib/dashboard";
import { wipeStore } from "@/lib/storage";
import { MAX_BACKUP_BYTES, parseBackup, serializeBackup } from "@/lib/backup";
import { decryptBackup, encryptBackup, isEncryptedBackup, MAX_ENCRYPTED_BACKUP_BYTES, MIN_BACKUP_PASSPHRASE_LENGTH } from "@/lib/backup-encryption";
import { emptyStore, type Store } from "@/lib/types";
import { useState } from "react";
import { usePranchetaStore } from "./store-provider";

export function DashboardClient() {
  const { store, setStore } = usePranchetaStore();
  const [wipeOnce, setWipeOnce] = useState(false);
  const [backupPreview, setBackupPreview] = useState<Store | null>(null);
  const [backupMessage, setBackupMessage] = useState("");
  const [backupError, setBackupError] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [selectedBackupFile, setSelectedBackupFile] = useState<File | null>(null);
  const [awaitingRestorePassphrase, setAwaitingRestorePassphrase] = useState(false);
  const [exportPassphrase, setExportPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [restorePassphrase, setRestorePassphrase] = useState("");
  const snap = dashboardSnapshot(store);

  async function readBackup(file?: File) {
    setBackupPreview(null);
    setBackupMessage("");
    setBackupError(false);
    if (!file) return;
    if (file.size > MAX_ENCRYPTED_BACKUP_BYTES) {
      setBackupMessage("O arquivo excede o limite de backup criptografado. Seus dados atuais continuam intactos.");
      setBackupError(true);
      return;
    }
    let encryptedFile = false;
    try {
      const content = await file.text();
      let plainText = content;
      encryptedFile = isEncryptedBackup(content);
      if (encryptedFile) {
        setAwaitingRestorePassphrase(true);
        if (!restorePassphrase) {
          setBackupMessage("Digite a frase-senha para abrir o backup criptografado. Seus dados atuais continuam intactos.");
          setBackupError(true);
          return;
        }
        plainText = await decryptBackup(content, restorePassphrase);
        setAwaitingRestorePassphrase(false);
        setRestorePassphrase("");
      } else if (file.size > MAX_BACKUP_BYTES) {
        setAwaitingRestorePassphrase(false);
        setBackupMessage("O arquivo JSON excede o limite de 5 MB. Seus dados atuais continuam intactos.");
        setBackupError(true);
        return;
      }
      if (!isEncryptedBackup(content)) setAwaitingRestorePassphrase(false);
      const result = parseBackup(plainText);
      if (!result.ok) {
        setBackupMessage(result.message);
        setBackupError(true);
        return;
      }
      setBackupPreview(result.store);
      setBackupMessage(`Backup válido: ${result.store.jobs.length} vagas, ${result.store.profile.projects.length} projetos e ${result.store.applications.length} registros.`);
      setBackupError(false);
    } catch {
      setBackupMessage("Não foi possível abrir o backup. Confira a frase-senha e o arquivo; seus dados atuais continuam intactos.");
      setBackupError(true);
      setRestorePassphrase("");
      setAwaitingRestorePassphrase(encryptedFile);
    }
  }

  async function exportEncryptedBackup() {
    setBackupMessage("");
    setBackupError(false);
    if (exportPassphrase !== confirmPassphrase) {
      setBackupMessage("As frases-senha não coincidem.");
      setBackupError(true);
      return;
    }
    setBackupBusy(true);
    try {
      const content = await encryptBackup(serializeBackup(store), exportPassphrase);
      const blob = new Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "prancheta-backup.enc";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setBackupMessage("Backup criptografado baixado. A frase-senha não foi salva; sem ela, não há recuperação.");
    } catch (error) {
      setBackupMessage(error instanceof Error ? error.message : "Não foi possível criptografar o backup.");
      setBackupError(true);
    } finally {
      setExportPassphrase("");
      setConfirmPassphrase("");
      setBackupBusy(false);
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
            setBackupMessage("");
            setBackupError(false);
            const content = serializeBackup(store);
            if (new TextEncoder().encode(content).byteLength > MAX_BACKUP_BYTES) {
              setBackupMessage("Os dados excedem 5 MB e não podem ser exportados por este recurso.");
              setBackupError(true);
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
        <p className="muted">O JSON inclui currículo e anotações e não é criptografado; guarde-o em local privado. Nada é enviado ao servidor.</p>
        <h3>Exportar backup criptografado</h3>
        <label htmlFor="backup-passphrase">Frase-senha (mínimo {MIN_BACKUP_PASSPHRASE_LENGTH} caracteres)</label>
        <input id="backup-passphrase" type="password" autoComplete="new-password" minLength={MIN_BACKUP_PASSPHRASE_LENGTH} maxLength={256} aria-describedby="backup-encryption-help" value={exportPassphrase} onChange={(event) => setExportPassphrase(event.target.value)} />
        <label htmlFor="backup-passphrase-confirm">Confirme a frase-senha</label>
        <input id="backup-passphrase-confirm" type="password" autoComplete="new-password" minLength={MIN_BACKUP_PASSPHRASE_LENGTH} maxLength={256} aria-describedby="backup-encryption-help" value={confirmPassphrase} onChange={(event) => setConfirmPassphrase(event.target.value)} />
        <p id="backup-encryption-help" className="muted">Criptografia acontece neste navegador com AES-GCM. Escolha uma frase longa e exclusiva; o mínimo de caracteres não garante força. A frase-senha não é guardada nem enviada. Se esquecê-la, este arquivo não poderá ser recuperado.</p>
        <button className="sec" type="button" disabled={backupBusy || !exportPassphrase || !confirmPassphrase} onClick={() => void exportEncryptedBackup()}>
          {backupBusy ? "Criptografando…" : "Exportar backup criptografado"}
        </button>
        <label htmlFor="backup-json">Restaurar backup JSON ou criptografado (até 5 MB de dados)</label>
        <input
          id="backup-json"
          type="file"
          accept="application/json,.json,.enc"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0] ?? null;
            setSelectedBackupFile(file);
            setAwaitingRestorePassphrase(false);
            void readBackup(file ?? undefined);
          }}
        />
        <label htmlFor="backup-restore-passphrase">Frase-senha (só para backup criptografado)</label>
        <input id="backup-restore-passphrase" type="password" autoComplete="current-password" maxLength={256} aria-describedby="backup-restore-help" value={restorePassphrase} onChange={(event) => setRestorePassphrase(event.target.value)} />
        <p id="backup-restore-help" className="muted">Para arquivo criptografado, digite a frase-senha antes de abrir e validar. O arquivo não é enviado.</p>
        {awaitingRestorePassphrase && selectedBackupFile ? (
          <button className="sec" type="button" disabled={!restorePassphrase} onClick={() => void readBackup(selectedBackupFile)}>
            Abrir e validar backup criptografado
          </button>
        ) : null}
        {backupMessage ? <p className={backupError ? "error-summary bad" : "muted"} role={backupError ? "alert" : "status"}>{backupMessage}</p> : null}
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
