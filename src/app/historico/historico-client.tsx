"use client";

import { setApplicationStatus } from "@/lib/applications";
import { KANBAN_COLUMNS, groupByStatus } from "@/lib/dashboard";
import { isFeedbackDue } from "@/lib/followup";
import { stampClass, stampLabel } from "@/lib/stamps";
import type { ApplicationStatus } from "@/lib/types";
import { usePranchetaStore } from "../store-provider";

export function HistoricoClient() {
  const { store, setStore } = usePranchetaStore();
  const board = groupByStatus(store.applications);

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
        <h2>Linhas</h2>
        {store.applications.map((a) => (
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
