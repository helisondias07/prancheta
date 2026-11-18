"use client";

import { useState } from "react";
import { filterApplications, removeApplication, setApplicationStatus } from "@/lib/applications";
import { KANBAN_COLUMNS, groupByStatus } from "@/lib/dashboard";
import { draftFollowUpMessage } from "@/lib/draft";
import { isFeedbackDue } from "@/lib/followup";
import { applicationJobAddedLabel, applicationSourceLabel, safeExternalHttpUrl } from "@/lib/provenance";
import { stampClass, stampLabel } from "@/lib/stamps";
import type { ApplicationStatus } from "@/lib/types";
import { usePranchetaStore } from "../store-provider";

export function HistoricoClient() {
  const { store, setStore } = usePranchetaStore();
  const board = groupByStatus(store.applications);
  const [copyFeedback, setCopyFeedback] = useState<{ id: string; message: string } | null>(null);
  const [removePromptId, setRemovePromptId] = useState<string | null>(null);
  const [removalFeedback, setRemovalFeedback] = useState("");
  const [historyQuery, setHistoryQuery] = useState("");
  const visibleApplications = filterApplications(store.applications, historyQuery);

  return (
    <>
      <section className="paper">
        <h2>Kanban (local)</h2>
        <p className="muted">
          Você move o cartão. Esta página não fala com recrutador e não marca envio sozinha.
        </p>
        {store.applications.length === 0 ? (
          <p className="muted">Nenhuma candidatura registrada neste navegador.</p>
        ) : (
          <div className="kanban">
            {KANBAN_COLUMNS.map((status) => (
              <div key={status} className="kanban-col">
                <h3>
                  {status} ({board[status].length})
                </h3>
                {board[status].map((a) => (
                  <p key={a.id}>
                    <span className={`stamp ${stampClass(a.status, isFeedbackDue(a.appliedAt))}`}>
                      {stampLabel(a.status, isFeedbackDue(a.appliedAt))}
                    </span>{" "}
                    {a.title}
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="paper" style={{ marginTop: "1.5rem" }}>
        <h2>Linhas ({visibleApplications.length} de {store.applications.length})</h2>
        <label htmlFor="history-search">Filtrar por vaga, empresa ou status</label>
        <input
          id="history-search"
          type="search"
          value={historyQuery}
          onChange={(event) => setHistoryQuery(event.target.value)}
          placeholder="Ex.: produto, empresa, aguardando"
          autoComplete="off"
        />
        {removalFeedback ? <p role="status" aria-live="polite">{removalFeedback}</p> : null}
        {visibleApplications.length === 0 && store.applications.length > 0 ? (
          <p role="status">Nenhuma candidatura corresponde. Apague o texto para ver todas.</p>
        ) : null}
        {visibleApplications.map((a) => (
          <div key={a.id} className="row">
            <div>
              <span className={`stamp ${stampClass(a.status, isFeedbackDue(a.appliedAt))}`}>
                {stampLabel(a.status, isFeedbackDue(a.appliedAt))}
              </span>{" "}
              {a.title} {a.company ? `· ${a.company}` : ""}
              <p className="muted">{applicationSourceLabel(a.source)}</p>
              <p className="muted">{applicationJobAddedLabel(a.jobAddedAt)}</p>
              {safeExternalHttpUrl(a.url) ? (
                <>
                  <p><a href={safeExternalHttpUrl(a.url)!} target="_blank" rel="noopener noreferrer">Abrir anúncio informado</a></p>
                  <p className="muted">Link informado, não verificado nem acessado pela VagaMatch. Pode apontar para site externo ou endereço interno; confira antes de abrir.</p>
                </>
              ) : <p className="muted">Sem link http(s) utilizável.</p>}
              {a.appliedAt ? (
                <div className="muted mono">
                  Você marcou que se candidatou em {new Date(a.appliedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (BRT)
                </div>
              ) : null}
              {isFeedbackDue(a.appliedAt) && a.status === "candidatou" ? (
                <p className="warn">Faz 7 dias. Quer um rascunho de follow-up? Você envia.</p>
              ) : null}
              {isFeedbackDue(a.appliedAt) && a.status === "candidatou" ? (
                <div className="notice">
                  <div className="draft">{draftFollowUpMessage({ jobTitle: a.title, company: a.company }).body}</div>
                  <button type="button" onClick={async () => {
                    const body = draftFollowUpMessage({ jobTitle: a.title, company: a.company }).body;
                    try {
                      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
                      await navigator.clipboard.writeText(body);
                      setCopyFeedback({ id: a.id, message: "Rascunho copiado; envio continua manual." });
                    } catch {
                      setCopyFeedback({ id: a.id, message: "Não foi possível copiar. Selecione o texto para copiar manualmente." });
                    }
                  }}>Copiar rascunho</button>
                  {copyFeedback?.id === a.id ? <p role="status">{copyFeedback.message}</p> : null}
                </div>
              ) : null}
              <label htmlFor={`notes-${a.id}`}>Nota privada sobre esta candidatura</label>
              <textarea
                id={`notes-${a.id}`}
                value={a.notes}
                onChange={(e) => setStore((s) => ({
                  ...s,
                  applications: s.applications.map((item) => item.id === a.id ? { ...item, notes: e.target.value } : item),
                }))}
                rows={3}
              />
              <button
                type="button"
                className="secondary"
                aria-label={`Remover ${a.title} do histórico`}
                aria-expanded={removePromptId === a.id}
                onClick={() => {
                  setRemovalFeedback("");
                  setRemovePromptId((current) => current === a.id ? null : a.id);
                }}
              >Remover do histórico</button>
              {removePromptId === a.id ? (
                <div className="notice" role="group" aria-label={`Confirmação para remover ${a.title}`}>
                  <p>Remove a candidatura e a nota privada deste histórico local. A vaga salva continua em “Vagas”. Não há desfazer.</p>
                  <button type="button" onClick={() => {
                    setStore((s) => ({ ...s, applications: removeApplication(s.applications, a.id) }));
                    setRemovePromptId(null);
                    setRemovalFeedback(`${a.title} removida do histórico local. A vaga salva continua em “Vagas”.`);
                  }}>Confirmar remoção</button>
                  <button type="button" className="secondary" onClick={() => setRemovePromptId(null)}>Cancelar</button>
                </div>
              ) : null}
              <p className="muted">Salvo automaticamente só neste aparelho. Não envia mensagens.</p>
            </div>
            <select
              aria-label={`Status de ${a.title}`}
              value={a.status}
              onChange={(e) => {
                const status = e.target.value as ApplicationStatus;
                setStore((s) => ({
                  ...s,
                  applications: setApplicationStatus(s.applications, a.id, status),
                }));
              }}
            >
              {KANBAN_COLUMNS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        ))}
      </section>
    </>
  );
}
