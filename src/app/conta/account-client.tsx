"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import { usePranchetaStore } from "../store-provider";
import { parseBackup, serializeBackup } from "@/lib/backup";
import { encryptBackup, MIN_BACKUP_PASSPHRASE_LENGTH } from "@/lib/backup-encryption";
import { accountRecoveryRedirect, validateNewAccountPassword } from "@/lib/password-recovery";
import type { Store } from "@/lib/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const AUTO_SYNC_STORAGE_KEY = "prancheta:auto-sync:v1";
const AUTO_SYNC_DEBOUNCE_MS = 1800;

function configured(): boolean {
  try {
    return !!key && !!url && new URL(url).protocol === "https:" && new URL(url).origin === url.replace(/\/$/, "");
  } catch {
    return false;
  }
}

function isStoreEmpty(store: Store): boolean {
  return (
    !store.profile.cvText.trim() &&
    store.profile.projects.length === 0 &&
    store.jobs.length === 0 &&
    store.applications.length === 0
  );
}

type Snapshot = { data: unknown; revision: number; updated_at: string };

export function AccountClient() {
  const { store, setStore, ready } = usePranchetaStore();
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [signedIn, setSignedIn] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirm, setSignUpConfirm] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [exportPassphrase, setExportPassphrase] = useState("");
  const [exportConfirm, setExportConfirm] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [autoSync, setAutoSync] = useState(false);
  const [syncNote, setSyncNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const revisionRef = useRef<number | null | undefined>(undefined);
  const lastSyncedPayloadRef = useRef<string>("");

  useEffect(() => {
    try {
      if (window.localStorage.getItem(AUTO_SYNC_STORAGE_KEY) === "1") {
        setAutoSync(true);
      }
    } catch {
      /* localStorage indisponível mantém sincronização manual */
    }
  }, []);

  useEffect(() => {
    if (!configured()) return;
    const supabase = createClient(url!, key!);
    setClient(supabase);
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSignedIn(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSignedIn(!!session);
      if (!session) {
        revisionRef.current = undefined;
        lastSyncedPayloadRef.current = "";
        setSyncNote("");
      }
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function request(method: string, body?: unknown, path = "/api/conta/snapshot") {
    const { data } = await client!.auth.getSession();
    if (!data.session) throw new Error("Sessão expirada. Entre novamente.");
    const response = await fetch(path, {
      method,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    if (!response.ok) {
      const err = new Error(result.error || "Não foi possível concluir a operação.") as Error & { status?: number };
      err.status = response.status;
      throw err;
    }
    return result;
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    setIsError(false);
    try {
      await action();
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Não foi possível concluir a operação.");
    } finally {
      setBusy(false);
    }
  }

  async function remote(): Promise<Snapshot | null> {
    return (await request("GET")).snapshot;
  }

  function updateAutoSyncPreference(next: boolean) {
    setAutoSync(next);
    setSyncNote("");
    try {
      if (next) window.localStorage.setItem(AUTO_SYNC_STORAGE_KEY, "1");
      else window.localStorage.removeItem(AUTO_SYNC_STORAGE_KEY);
    } catch {
      /* ignora falha de armazenamento local */
    }
  }

  useEffect(() => {
    if (!client || !signedIn || recovering || !ready || !autoSync) return;
    const serialized = serializeBackup(store);
    if (serialized === lastSyncedPayloadRef.current && revisionRef.current !== undefined) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setSyncNote("Sincronizando alterações…");
        if (revisionRef.current === undefined) {
          const existing = await remote();
          if (cancelled) return;
          if (existing && isStoreEmpty(store)) {
            updateAutoSyncPreference(false);
            setIsError(true);
            setMessage(
              "Existe uma cópia remota salva e este navegador está vazio. Clique em 'Restaurar cópia' antes de ativar a sincronização automática.",
            );
            return;
          }
          revisionRef.current = existing?.revision ?? null;
          if (existing && JSON.stringify(existing.data) === serialized) {
            lastSyncedPayloadRef.current = serialized;
            setSyncNote("Cópia em nuvem já está em dia.");
            return;
          }
        }
        const saved = await request("PUT", { data: store, revision: revisionRef.current ?? null });
        if (cancelled) return;
        revisionRef.current = saved.revision ?? revisionRef.current;
        lastSyncedPayloadRef.current = serialized;
        const stamp = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        setSyncNote(`Sincronizado automaticamente às ${stamp}.`);
      } catch (err) {
        if (cancelled) return;
        const status = (err as { status?: number })?.status;
        if (status === 409) {
          revisionRef.current = undefined;
          updateAutoSyncPreference(false);
          setIsError(true);
          setMessage("A cópia remota mudou em outro aparelho. A sincronização automática foi pausada para não sobrescrever dados.");
        } else {
          setSyncNote("Falha temporária ao sincronizar automaticamente.");
        }
      }
    }, AUTO_SYNC_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [client, signedIn, recovering, ready, autoSync, store]);

  if (!configured()) {
    return (
      <section className="paper">
        <h2>Conta e cópia em nuvem</h2>
        <p className="muted">Conta em nuvem desativada neste ambiente. Seus dados continuam salvos neste navegador.</p>
      </section>
    );
  }

  return (
    <section className="paper">
      <h2>Conta e cópia remota</h2>
      <p className="muted">
        O uso local funciona sem cadastro. Com uma conta, você guarda e restaura sua cópia (currículo em texto, projetos, vagas e histórico, sem o arquivo PDF) entre celular e computador.
      </p>

      {!signedIn ? (
        <div>
          <div className="mode-tabs" role="group" aria-label="Modo de acesso">
            <button
              type="button"
              className={authMode === "signin" ? "" : "sec"}
              aria-pressed={authMode === "signin"}
              onClick={() => {
                setAuthMode("signin");
                setMessage("");
                setIsError(false);
              }}
            >
              Entrar
            </button>
            <button
              type="button"
              className={authMode === "signup" ? "" : "sec"}
              aria-pressed={authMode === "signup"}
              onClick={() => {
                setAuthMode("signup");
                setMessage("");
                setIsError(false);
              }}
            >
              Criar conta
            </button>
          </div>

          {authMode === "signin" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void run(async () => {
                  const { error } = await client!.auth.signInWithPassword({ email: email.trim(), password });
                  if (error) throw new Error("Não foi possível entrar. Verifique e-mail, senha ou se o cadastro já foi confirmado.");
                  setPassword("");
                  setMessage("Sessão iniciada.");
                });
              }}
            >
              <label htmlFor="account-email">Email</label>
              <input
                id="account-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label htmlFor="account-password">Senha</label>
              <input
                id="account-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="actions">
                <button disabled={busy || !client}>Entrar</button>
                <button
                  className="sec"
                  type="button"
                  disabled={busy || !client || !email.trim()}
                  onClick={() =>
                    void run(async () => {
                      const { error } = await client!.auth.resetPasswordForEmail(email.trim(), {
                        redirectTo: accountRecoveryRedirect(window.location.origin),
                      });
                      if (error) throw new Error("Não foi possível solicitar a recuperação agora.");
                      setMessage("Se a conta existir, enviaremos as instruções quando o e-mail puder ser entregue.");
                    })
                  }
                >
                  Esqueci a senha
                </button>
              </div>
            </form>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void run(async () => {
                  const validation = validateNewAccountPassword(signUpPassword, signUpConfirm);
                  if (validation) throw new Error(validation);
                  const { data, error } = await client!.auth.signUp({
                    email: email.trim(),
                    password: signUpPassword,
                    options: { emailRedirectTo: accountRecoveryRedirect(window.location.origin) },
                  });
                  if (error) {
                    throw new Error("Não foi possível criar a conta. Confira o e-mail informado ou use Entrar se já tiver cadastro.");
                  }
                  setSignUpPassword("");
                  setSignUpConfirm("");
                  if (data.user?.identities && data.user.identities.length === 0) {
                    setAuthMode("signin");
                    setMessage("Se este e-mail já estiver cadastrado, use Entrar ou Esqueci a senha.");
                    return;
                  }
                  if (data.session) {
                    setSignedIn(true);
                    setMessage("Conta criada e sessão iniciada.");
                    return;
                  }
                  setAuthMode("signin");
                  setMessage("Conta criada! Confira sua caixa de entrada (e o spam) para confirmar o e-mail antes de entrar.");
                });
              }}
            >
              <label htmlFor="signup-email">Email</label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label htmlFor="signup-password">Criar senha (mínimo 8 caracteres)</label>
              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={signUpPassword}
                onChange={(e) => setSignUpPassword(e.target.value)}
              />
              <label htmlFor="signup-password-confirm">Confirme a senha</label>
              <input
                id="signup-password-confirm"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={signUpConfirm}
                onChange={(e) => setSignUpConfirm(e.target.value)}
              />
              <div className="actions">
                <button disabled={busy || !client || !email.trim() || !signUpPassword || !signUpConfirm}>
                  Criar minha conta
                </button>
              </div>
            </form>
          )}
        </div>
      ) : recovering ? (
        <div>
          <h2>Definir nova senha</h2>
          <p>Escolha uma senha nova para esta conta.</p>
          <label htmlFor="new-account-password">Nova senha</label>
          <input
            id="new-account-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <label htmlFor="new-account-password-confirm">Confirme a nova senha</label>
          <input
            id="new-account-password-confirm"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={newPasswordConfirm}
            onChange={(e) => setNewPasswordConfirm(e.target.value)}
          />
          <button
            disabled={busy || !newPassword || !newPasswordConfirm}
            onClick={() =>
              void run(async () => {
                const validation = validateNewAccountPassword(newPassword, newPasswordConfirm);
                if (validation) throw new Error(validation);
                const { error } = await client!.auth.updateUser({ password: newPassword });
                if (error) throw new Error("Não foi possível atualizar a senha.");
                setNewPassword("");
                setNewPasswordConfirm("");
                setRecovering(false);
                setMessage("Senha atualizada.");
              })
            }
          >
            Atualizar senha
          </button>
        </div>
      ) : (
        <div>
          <p>{autoSync ? "Sessão iniciada. Sincronização automática ativa neste navegador." : "Sessão iniciada. Não há sincronização automática."}</p>
          <label className="check-row" htmlFor="account-auto-sync">
            <input
              id="account-auto-sync"
              type="checkbox"
              checked={autoSync}
              onChange={(e) => updateAutoSyncPreference(e.target.checked)}
            />
            <span>Sincronizar automaticamente alterações deste navegador (salva 2s após parar de editar, com trava contra conflito)</span>
          </label>
          {syncNote ? (
            <p className="muted" role="status">
              {syncNote}
            </p>
          ) : null}

          <div className="actions">
            <button
              disabled={busy || !ready}
              onClick={() =>
                void run(async () => {
                  const previous = await remote();
                  if (
                    !window.confirm(
                      previous
                        ? `Substituir a cópia remota de ${previous.updated_at}? Seus dados pessoais serão enviados.`
                        : "Enviar seus dados pessoais e criar uma cópia remota?",
                    )
                  )
                    return;
                  const saved = await request("PUT", { data: store, revision: previous?.revision ?? null });
                  revisionRef.current = saved.revision ?? null;
                  lastSyncedPayloadRef.current = serializeBackup(store);
                  setMessage("Cópia salva.");
                })
              }
            >
              Salvar cópia remota
            </button>
            <button
              className="sec"
              disabled={busy || !ready}
              onClick={() =>
                void run(async () => {
                  const snapshot = await remote();
                  if (!snapshot) throw new Error("Nenhuma cópia remota encontrada.");
                  const parsed = parseBackup(JSON.stringify(snapshot.data));
                  if (!parsed.ok) throw new Error(parsed.message);
                  if (
                    !window.confirm(
                      `Substituir os dados deste navegador pela cópia de ${snapshot.updated_at}? Exporte um backup local antes se precisar preservá-los.`,
                    )
                  )
                    return;
                  revisionRef.current = snapshot.revision;
                  lastSyncedPayloadRef.current = serializeBackup(parsed.store);
                  setStore(parsed.store);
                  setMessage("Cópia restaurada neste navegador.");
                })
              }
            >
              Restaurar cópia
            </button>
            <button
              className="sec"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  if (!window.confirm("Excluir a cópia remota? Isso não exclui a conta nem os dados deste navegador.")) return;
                  await request("DELETE");
                  revisionRef.current = null;
                  lastSyncedPayloadRef.current = "";
                  setMessage("Cópia remota excluída.");
                })
              }
            >
              Excluir cópia
            </button>
            <button
              className="sec"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const { error } = await client!.auth.signOut();
                  if (error) throw error;
                  setEmail("");
                  setMessage("Sessão encerrada.");
                })
              }
            >
              Sair
            </button>
          </div>

          <h3 style={{ marginTop: "1.5rem", fontFamily: "var(--font-serif)" }}>Exportar cópia criptografada</h3>
          <p id="remote-backup-help" className="muted">
            A frase-senha não é salva; sem ela o arquivo não poderá ser recuperado. Use pelo menos {MIN_BACKUP_PASSPHRASE_LENGTH} caracteres.
          </p>
          <label htmlFor="remote-passphrase">Frase-senha do backup</label>
          <input
            id="remote-passphrase"
            type="password"
            autoComplete="new-password"
            maxLength={256}
            aria-describedby="remote-backup-help"
            value={exportPassphrase}
            onChange={(e) => setExportPassphrase(e.target.value)}
          />
          <label htmlFor="remote-passphrase-confirm">Repita a frase-senha</label>
          <input
            id="remote-passphrase-confirm"
            type="password"
            autoComplete="new-password"
            maxLength={256}
            value={exportConfirm}
            onChange={(e) => setExportConfirm(e.target.value)}
          />
          <button
            className="sec"
            disabled={busy || !exportPassphrase || !exportConfirm}
            onClick={() =>
              void run(async () => {
                if (exportPassphrase !== exportConfirm) throw new Error("As frases-senha não coincidem.");
                const snapshot = await remote();
                if (!snapshot) throw new Error("Nenhuma cópia remota encontrada.");
                const parsed = parseBackup(JSON.stringify(snapshot.data));
                if (!parsed.ok) throw new Error(parsed.message);
                const encrypted = await encryptBackup(serializeBackup(parsed.store), exportPassphrase);
                const link = document.createElement("a");
                const objectUrl = URL.createObjectURL(new Blob([encrypted], { type: "application/json" }));
                link.href = objectUrl;
                link.download = "prancheta-copia-remota-criptografada.json";
                link.click();
                URL.revokeObjectURL(objectUrl);
                setExportPassphrase("");
                setExportConfirm("");
                setMessage("Exportação criptografada iniciada.");
              })
            }
          >
            Exportar cópia criptografada
          </button>

          <h3 style={{ marginTop: "1.5rem", fontFamily: "var(--font-serif)" }}>Excluir conta</h3>
          <p id="delete-help" className="muted">
            Exclui a conta e a cópia remota. Os dados deste navegador e backups da infraestrutura permanecem. Tokens emitidos podem continuar válidos até expirar. Contas com autenticação multifator ainda não podem usar esta opção.
          </p>
          <label htmlFor="delete-password">Senha da conta</label>
          <input
            id="delete-password"
            type="password"
            autoComplete="current-password"
            maxLength={1024}
            aria-describedby="delete-help"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
          />
          <label htmlFor="delete-confirm">Digite EXCLUIR</label>
          <input id="delete-confirm" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} />
          <button
            className="sec"
            disabled={busy || !deletePassword || deleteConfirm !== "EXCLUIR"}
            onClick={() =>
              void run(async () => {
                if (!window.confirm("Excluir permanentemente a conta e a cópia remota? Os dados deste navegador permanecem.")) return;
                try {
                  await request("POST", { password: deletePassword, confirmation: deleteConfirm }, "/api/conta/excluir");
                } finally {
                  setDeletePassword("");
                  setDeleteConfirm("");
                }
                const logout = await client!.auth.signOut({ scope: "local" }).catch(() => ({ error: new Error("logout") }));
                updateAutoSyncPreference(false);
                setSignedIn(false);
                setMessage(
                  logout.error
                    ? "Conta e cópia remota excluídas, mas não foi possível confirmar a saída neste navegador. Dados locais e backups permanecem."
                    : "Conta e cópia remota excluídas. Dados locais e backups da infraestrutura permanecem.",
                );
              })
            }
          >
            Excluir minha conta
          </button>
        </div>
      )}

      {busy || message ? (
        <p className={isError ? "error-summary bad" : "ok"} role={isError ? "alert" : "status"} aria-live="polite" style={{ marginTop: "0.85rem" }}>
          {busy ? "Aguarde…" : message}
        </p>
      ) : null}
    </section>
  );
}
