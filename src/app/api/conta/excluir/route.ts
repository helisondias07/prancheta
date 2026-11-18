import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
const reply = (body: unknown, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !adminKey) return reply({ error: "Exclusão de conta não configurada." }, 503);
  const token = request.headers.get("authorization")?.match(/^Bearer ([^ ]+)$/)?.[1];
  if (!token) return reply({ error: "Sessão inválida." }, 401);
  if (Number(request.headers.get("content-length") || 0) > 4096) return reply({ error: "Pedido inválido." }, 400);
  const reader = request.body?.getReader();
  if (!reader) return reply({ error: "Pedido inválido." }, 400);
  const chunks: Uint8Array[] = []; let size = 0;
  for (;;) {
    const chunk = await reader.read(); if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > 4096) { await reader.cancel(); return reply({ error: "Pedido inválido." }, 400); }
    chunks.push(chunk.value);
  }
  const text = await new Blob(chunks as BlobPart[]).text();
  let input: { password?: unknown; confirmation?: unknown };
  try { input = JSON.parse(text); } catch { return reply({ error: "Pedido inválido." }, 400); }
  if (!input || input.confirmation !== "EXCLUIR" || typeof input.password !== "string" || !input.password || input.password.length > 1024) return reply({ error: "Confirmação ou senha inválida." }, 400);

  const auth = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: verified, error: verifyError } = await auth.auth.getUser(token).catch(() => ({ data: { user: null }, error: new Error("unavailable") }));
  const user = verified?.user;
  if (verifyError || !user?.id || !user.email) return reply({ error: "Sessão inválida." }, 401);
  if (user.factors?.some(f => f.status === "verified")) return reply({ error: "Exclusão com autenticação multifator ainda não disponível; contate o suporte." }, 403);
  const { data: reauth, error: reauthError } = await auth.auth.signInWithPassword({ email: user.email, password: input.password }).catch(() => ({ data: { user: null }, error: new Error("unavailable") }));
  if (reauthError || reauth?.user?.id !== user.id) return reply({ error: "Senha incorreta ou confirmação indisponível." }, 401);
  const admin = createClient(url, adminKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.auth.admin.deleteUser(user.id).catch(() => ({ error: new Error("unavailable") }));
  if (error) return reply({ error: "Não foi possível confirmar a exclusão. Verifique o estado da conta antes de tentar novamente." }, 500);
  return reply({ ok: true }, 200);
}
