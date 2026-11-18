import { createClient } from "@supabase/supabase-js";
import { parseBackup, serializeBackup } from "@/lib/backup";
import type { Store } from "@/lib/types";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });

async function session(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const token = request.headers.get("authorization")?.match(/^Bearer ([^ ]+)$/)?.[1];
  if (!url || !key || !token) return null;
  try {
    const client = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.getUser(token);
    return error || !data.user ? null : { client, id: data.user.id };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const s = await session(request);
  if (!s) return reply({ error: "Sessão inválida ou integração desativada." }, 401);
  const { data, error } = await s.client.from("user_snapshots").select("data,revision,updated_at").eq("user_id", s.id).maybeSingle();
  if (error) return reply({ error: "Não foi possível consultar a cópia." }, 500);
  return reply({ snapshot: data });
}

export async function PUT(request: Request) {
  const s = await session(request);
  if (!s) return reply({ error: "Sessão inválida ou integração desativada." }, 401);
  if (Number(request.headers.get("content-length") || 0) > 5_300_000) return reply({ error: "Cópia muito grande." }, 413);
  let input: { data?: unknown; revision?: unknown };
  try {
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: "Dados inválidos." }, 400);
    const parts: Uint8Array[] = []; let size = 0;
    for (;;) {
      const next = await reader.read(); if (next.done) break;
      size += next.value.byteLength;
      if (size > 5_300_000) { await reader.cancel(); return reply({ error: "Cópia muito grande." }, 413); }
      parts.push(next.value);
    }
    input = JSON.parse(await new Blob(parts as BlobPart[]).text());
  } catch { return reply({ error: "Dados inválidos." }, 400); }
  if (!input || (input.revision !== null && (!Number.isSafeInteger(input.revision) || Number(input.revision) < 1))) return reply({ error: "Revisão inválida." }, 400);
  const parsed = parseBackup(JSON.stringify(input.data));
  if (!parsed.ok) return reply({ error: parsed.message }, 400);
  const data = JSON.parse(serializeBackup(parsed.store as Store));
  const result = input.revision === null
    ? await s.client.from("user_snapshots").insert({ user_id: s.id, data }).select("revision").maybeSingle()
    : await s.client.from("user_snapshots").update({ data }).eq("user_id", s.id).eq("revision", input.revision).select("revision").maybeSingle();
  if (result.error?.code === "23505" || (!result.error && !result.data)) return reply({ error: "A cópia mudou. Consulte-a novamente antes de salvar." }, 409);
  if (result.error) return reply({ error: "Não foi possível salvar a cópia." }, 500);
  return reply({ revision: result.data?.revision });
}

export async function DELETE(request: Request) {
  const s = await session(request);
  if (!s) return reply({ error: "Sessão inválida ou integração desativada." }, 401);
  const { error } = await s.client.from("user_snapshots").delete().eq("user_id", s.id);
  return error ? reply({ error: "Não foi possível excluir a cópia." }, 500) : reply({ ok: true });
}
