import { NextResponse } from "next/server";
import {
  classifyUrlOrToken,
  fetchAshbyBoard,
  fetchGreenhouseBoard,
  fetchLeverBoard,
  fetchRemotar,
} from "@/lib/sources";

const MAX_SOURCE_REQUEST_BYTES = 4096;

export async function POST(req: Request) {
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > MAX_SOURCE_REQUEST_BYTES) {
    return NextResponse.json({ error: "Pedido muito grande." }, { status: 413 });
  }
  let text: string;
  try {
    const reader = req.body?.getReader();
    if (!reader) return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_SOURCE_REQUEST_BYTES) {
        await reader.cancel();
        return NextResponse.json({ error: "Pedido muito grande." }, { status: 413 });
      }
      chunks.push(chunk.value);
    }
    text = new TextDecoder().decode(Buffer.concat(chunks));
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }
  let body: unknown;
  try { body = JSON.parse(text); } catch { return NextResponse.json({ error: "JSON invalido." }, { status: 400 }); }
  const input = body && typeof body === "object" && !Array.isArray(body)
    ? (body as { input?: unknown }).input
    : undefined;
  if (typeof input !== "string") return NextResponse.json({ error: "Informe uma fonte em texto." }, { status: 400 });
  const classified = classifyUrlOrToken(input);  if (classified.kind === "blocked" || classified.kind === "manual") {
    return NextResponse.json(
      { error: classified.reason ?? "Informe Greenhouse ou Remotar." },
      { status: 400 },
    );
  }
  try {
    const result =
      classified.kind === "greenhouse"
        ? await fetchGreenhouseBoard(classified.board ?? "")
        : classified.kind === "lever"
          ? await fetchLeverBoard(classified.board ?? "")
          : classified.kind === "ashby"
            ? await fetchAshbyBoard(classified.board ?? "")
            : await fetchRemotar();
    return NextResponse.json({
      source: classified.kind,
      jobs: result.jobs,
      total: result.total,
      capped: result.capped,
      note: result.capped
        ? classified.kind === "lever"
          ? "A lista chegou ao limite de importação; o quadro pode ter outras vagas."
          : `A fonte tem ${result.total} vagas; importamos as ${result.jobs.length} primeiras. Nada foi enviado.`
        : "Lista pública. A VagaMatch não se candidata por você.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao buscar.";
    const timeout = /abort|timeout/i.test(message);
    return NextResponse.json(
      {
        error: timeout
          ? "A lista pública demorou demais. Tente de novo ou cole o anúncio."
          : message,
      },
      { status: 502 },
    );
  }
}
