"use client";

import { dashboardSnapshot } from "@/lib/dashboard";
import { clipText, MAX_CV_CHARS } from "@/lib/limits";
import { analyzeEvidence, type EvidenceAnalysis } from "@/lib/match";
import { wipeStore } from "@/lib/storage";
import { MAX_BACKUP_BYTES, parseBackup, serializeBackup } from "@/lib/backup";
import {
  decryptBackup,
  encryptBackup,
  isEncryptedBackup,
  MAX_ENCRYPTED_BACKUP_BYTES,
  MIN_BACKUP_PASSPHRASE_LENGTH,
} from "@/lib/backup-encryption";
import { emptyStore, type Store } from "@/lib/types";
import { useState } from "react";
import { usePranchetaStore } from "./store-provider";

const SAMPLE_CV =
  "Desenvolvi aplicações web em React, Next.js e TypeScript com testes automatizados em Vitest e PostgreSQL. Quero aprender Golang em projetos futuros.";
const SAMPLE_JOB =
  "Vaga Pessoa Desenvolvedora Full-Stack: experiência prática com React, Next.js, TypeScript, PostgreSQL, Golang e Docker.";

export function DashboardClient() {
  const { store, setStore } = usePranchetaStore();
  const [simCv, setSimCv] = useState(() => store.profile.cvText);
  const [simJob, setSimJob] = useState(() => store.jobs[0]?.text ?? "");
  const [simResult, setSimResult] = useState<EvidenceAnalysis | null>(null);
  const [simSavedNote, setSimSavedNote] = useState("");
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

  function runSimulator(cvInput = simCv, jobInput = simJob) {
    setSimSavedNote("");
    if (!jobInput.trim() || (!cvInput.trim() && !store.profile.projects.some((p) => p.whatIDid.trim()))) {
      setSimResult(null);
      setSimSavedNote("Preencha um trecho do currículo (ou exemplo) e os requisitos da vaga para comparar.");
      return;
    }
    setSimResult(analyzeEvidence(cvInput, jobInput, [], store.profile));
  }

  function saveSimulatorToCaderno() {
    if (!simJob.trim()) return;
    const now = new Date().toISOString();
    const trimmedCv = simCv.trim().slice(0, MAX_CV_CHARS);
    const firstLine = simJob.trim().split(/\r?\n/)[0]?.slice(0, 80) || "Vaga analisada no simulador";
    setStore((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        cvText: prev.profile.cvText.trim() ? prev.profile.cvText : trimmedCv,
      },
      jobs: [
        {
          id: `sim-${Date.now()}`,
          title: firstLine,
          company: "",
          url: "",
          location: "",
          text: clipText(simJob.trim()),
          source: "manual",
          addedAt: now,
        },
        ...prev.jobs,
      ],
    }));
    setSimSavedNote("Análise guardada neste navegador. Abra Vagas para rascunhar sua mensagem ou Histórico para o controle D+7.");
  }

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
      setBackupMessage(
        `Backup válido: ${result.store.jobs.length} vagas, ${result.store.profile.projects.length} projetos e ${result.store.applications.length} registros.`,
      );
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
      link.download = "vagamatch-backup.enc";
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

  const flaggedCvMentions = simResult ? simResult.cvMentions.filter((item) => !item.noNegativeMarker) : [];

  return (
    <>
      <section className="paper" aria-labelledby="simulador-titulo">
        <h2 id="simulador-titulo">Teste agora em 30 segundos — sem criar conta</h2>
        <p className="muted">
          Diferente de chats genéricos que inventam experiência no seu currículo, a VagaMatch aponta exatamente qual frase comprova cada requisito, sinaliza menções negativas/de estudo e mostra o que falta antes da entrevista.
        </p>
        <div className="grid two">
          <div>
            <label htmlFor="sim-cv">Trecho do seu currículo (ou extraia PDF na aba Currículo)</label>
            <textarea
              id="sim-cv"
              value={simCv}
              maxLength={MAX_CV_CHARS}
              placeholder="Ex.: Desenvolvi aplicações em React, Next.js e TypeScript..."
              onChange={(e) => setSimCv(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="sim-job">Anúncio ou requisitos da vaga</label>
            <textarea
              id="sim-job"
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

        {simSavedNote ? (
          <p className="muted" role="status" style={{ marginTop: "0.75rem" }}>
            {simSavedNote}
          </p>
        ) : null}

        {simResult ? (
          <div className="vm-result" role="region" aria-label="Resultado da comparação imediata">
            <p className="vm-kicker" style={{ margin: "0 0 4px" }}>
              resultado · {simResult.compared} requisito(s) comparado(s)
            </p>
            <p className="muted" style={{ margin: 0 }}>
              {simResult.present.length} com frase afirmativa no texto analisado.
            </p>
            <div className="vm-diff">
              <div className="vm-diff-col">
                <p className="vm-diff-head">A vaga pede</p>
                <ol>
                  {[
                    ...simResult.present.map((term) => ({ term })),
                    ...flaggedCvMentions.map((m) => ({ term: m.term })),
                    ...simResult.missingEverywhere.map((term) => ({ term })),
                  ].map((row, index) => (
                    <li className="vm-diff-row" key={`dash-left-${row.term}-${index}`}>
                      <span className="vm-n">{String(index + 1).padStart(2, "0")}</span>
                      <span className="vm-term">{row.term}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="vm-diff-col is-evidence">
                <p className="vm-diff-head">Seu CV comprova</p>
                <ol>
                  {simResult.present.map((term, index) => (
                    <li className="vm-diff-row" key={`dash-ok-${term}-${index}`}>
                      <span className="vm-n">{String(index + 1).padStart(2, "0")}</span>
                      <span className="vm-diff-note is-ok">
                        comprovado<span className="vm-quote">frase afirmativa no texto</span>
                      </span>
                    </li>
                  ))}
                  {flaggedCvMentions.map((m, index) => (
                    <li className="vm-diff-row" key={`dash-flag-${m.term}-${index}`}>
                      <span className="vm-n">{String(simResult.present.length + index + 1).padStart(2, "0")}</span>
                      <span className="vm-diff-note is-gap">
                        lacuna<span className="vm-quote">estudo ou negação — “{m.quote}”</span>
                      </span>
                    </li>
                  ))}
                  {simResult.missingEverywhere.map((term, index) => (
                    <li className="vm-diff-row" key={`dash-gap-${term}-${index}`}>
                      <span className="vm-n">{String(simResult.present.length + flaggedCvMentions.length + index + 1).padStart(2, "0")}</span>
                      <span className="vm-diff-note is-gap">
                        lacuna<span className="vm-quote">ausente no currículo e nos projetos</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <div className="actions" style={{ marginTop: "0.65rem" }}>
              <button type="button" onClick={saveSimulatorToCaderno}>
                Guardar no meu Caderno e acompanhar D+7
              </button>
              <a className="btn-link sec" href="/curriculo">
                Importar meu PDF completo
              </a>
            </div>
          </div>
        ) : null}
      </section>

      <section className="paper" style={{ marginTop: "1.5rem" }}>
        <h2>Seu Caderno neste navegador</h2>
        <p className="muted">
          Resumo das vagas, projetos e retornos D+7 registrados neste aparelho. Você decide o que enviar a cada empresa.
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
            Última vaga: termos encontrados no texto —{" "}
            {snap.hasCv ? `CV sem marcador negativo reconhecido ${snap.latestMatch.coverage.cv}` : "CV não informado"}, projetos{" "}
            {snap.latestMatch.coverage.portfolio}; uso de projeto confirmado por você {snap.latestMatch.inPortfolio.length}; sem ocorrência textual{" "}
            {snap.latestMatch.missingEverywhere.length}. Menções não comprovam experiência. Não é ATS.
          </p>
        ) : (
          <p className="muted" style={{ marginTop: "0.8rem" }}>
            Sem comparação salva ainda — use o simulador acima ou cadastre vagas e projetos.
          </p>
        )}
        {snap.dueFollowups.length ? (
          <ul className="list">
            {snap.dueFollowups.map((a) => (
              <li key={a.id}>
                {a.title} {a.company ? `· ${a.company}` : ""} — faz 7 dias. Abra Histórico para copiar seu follow-up.
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="paper" style={{ marginTop: "1.5rem" }} aria-labelledby="planos-titulo">
        <h2 id="planos-titulo">Planos e Passe Sprint 90 Dias</h2>
        <p className="muted">
          Quem busca recolocação precisa de foco por 60 a 90 dias, não de mais uma assinatura esquecida. Compare localmente sem custo ou sincronize seu Caderno entre celular e computador.
        </p>
        <div className="plans-grid">
          <div className="plan-card">
            <div>
              <span className="stamp stamp-rascunho">Mês a mês</span>
              <h3>Mensal Flexível</h3>
              <p className="plan-price">R$ 34,90/mês</p>
              <ul className="list muted">
                <li>Cópia em nuvem e restauração entre celular e computador</li>
                <li>Histórico Kanban e lembretes D+7 sincronizados</li>
                <li>Exportação remota criptografada a qualquer momento</li>
              </ul>
            </div>
            <a className="btn-link sec" href="/conta">
              Criar conta em Acesso Antecipado
            </a>
          </div>

          <div className="plan-card plan-featured">
            <div>
              <span className="stamp stamp-d7">Ciclo completo · R$ 26,33/mês</span>
              <h3>Passe Sprint 90 Dias</h3>
              <p className="plan-price">R$ 79 / 3 meses</p>
              <ul className="list">
                <li>
                  <strong>90 dias completos de busca ativa</strong> em pagamento único (PIX ou cartão quando ativado)
                </li>
                <li>Sincronização automática ou manual entre celular e computador</li>
                <li>Auditoria literal CV × vaga × portfólio e fila D+7 sem limite de vagas</li>
                <li>Seus dados seguem exportáveis em JSON e backup cifrado mesmo após o ciclo</li>
              </ul>
            </div>
            <div>
              <a className="btn-link" href="/conta">
                Garantir conta no Acesso Antecipado
              </a>
              <p className="muted" style={{ fontSize: "0.82rem", marginTop: "0.4rem" }}>
                Cobrança via PIX/cartão em ativação — durante o acesso antecipado, a sincronização em nuvem está liberada gratuitamente em Conta.
              </p>
            </div>
          </div>

          <div className="plan-card">
            <div>
              <span className="stamp stamp-enviada">100% offline-first</span>
              <h3>Caderno Local</h3>
              <p className="plan-price">R$ 0</p>
              <ul className="list muted">
                <li>Comparação CV × vaga × projetos e leitura de PDF.js neste navegador</li>
                <li>Kanban local de candidaturas e rascunhos de follow-up D+7</li>
                <li>Backup manual em JSON ou criptografado (AES-GCM) no aparelho</li>
              </ul>
            </div>
            <a className="btn-link sec" href="/vagas">
              Usar somente neste navegador
            </a>
          </div>
        </div>
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
            a.download = "vagamatch-export.json";
            a.click();
            window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
          }}
        >
          Exportar JSON
        </button>
        <p className="muted">O JSON inclui currículo e anotações e não é criptografado; guarde-o em local privado. Nada é enviado ao servidor.</p>
        <h3>Exportar backup criptografado</h3>
        <label htmlFor="backup-passphrase">Frase-senha (mínimo {MIN_BACKUP_PASSPHRASE_LENGTH} caracteres)</label>
        <input
          id="backup-passphrase"
          type="password"
          autoComplete="new-password"
          minLength={MIN_BACKUP_PASSPHRASE_LENGTH}
          maxLength={256}
          aria-describedby="backup-encryption-help"
          value={exportPassphrase}
          onChange={(event) => setExportPassphrase(event.target.value)}
        />
        <label htmlFor="backup-passphrase-confirm">Confirme a frase-senha</label>
        <input
          id="backup-passphrase-confirm"
          type="password"
          autoComplete="new-password"
          minLength={MIN_BACKUP_PASSPHRASE_LENGTH}
          maxLength={256}
          aria-describedby="backup-encryption-help"
          value={confirmPassphrase}
          onChange={(event) => setConfirmPassphrase(event.target.value)}
        />
        <p id="backup-encryption-help" className="muted">
          Criptografia acontece neste navegador com AES-GCM. Escolha uma frase longa e exclusiva; o mínimo de caracteres não garante força. A frase-senha não é guardada nem enviada. Se esquecê-la, este arquivo não poderá ser recuperado.
        </p>
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
        <input
          id="backup-restore-passphrase"
          type="password"
          autoComplete="current-password"
          maxLength={256}
          aria-describedby="backup-restore-help"
          value={restorePassphrase}
          onChange={(event) => setRestorePassphrase(event.target.value)}
        />
        <p id="backup-restore-help" className="muted">
          Para arquivo criptografado, digite a frase-senha antes de abrir e validar. O arquivo não é enviado.
        </p>
        {awaitingRestorePassphrase && selectedBackupFile ? (
          <button className="sec" type="button" disabled={!restorePassphrase} onClick={() => void readBackup(selectedBackupFile)}>
            Abrir e validar backup criptografado
          </button>
        ) : null}
        {backupMessage ? (
          <p className={backupError ? "error-summary bad" : "muted"} role={backupError ? "alert" : "status"}>
            {backupMessage}
          </p>
        ) : null}
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
