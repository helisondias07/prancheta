import { NextResponse } from "next/server";
import {
  classifyUrlOrToken,
  fetchGreenhouseBoard,
  fetchRemotar,
} from "@/lib/sources";

export async function POST(req: Request) {
  let body: { input?: string };
  try {
    body = (await req.json()) as { input?: string };
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const classified = classifyUrlOrToken(body.input ?? "");
  if (classified.kind === "blocked" || classified.kind === "manual") {
    return NextResponse.json(
      { error: classified.reason ?? "Informe Greenhouse ou Remotar." },
      { status: 400 },
    );
  }
  try {
    const result =
      classified.kind === "greenhouse"
        ? await fetchGreenhouseBoard(classified.board ?? "")
        : await fetchRemotar();
    return NextResponse.json({
      source: classified.kind,
      jobs: result.jobs,
      total: result.total,
      capped: result.capped,
      note: result.capped
        ? `A fonte tem ${result.total} vagas; importamos as ${result.jobs.length} primeiras. Nada foi enviado.`
        : "Lista pública. A Prancheta não se candidata por você.",
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
