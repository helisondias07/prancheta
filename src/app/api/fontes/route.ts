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
    const jobs =
      classified.kind === "greenhouse"
        ? await fetchGreenhouseBoard(classified.board ?? "")
        : await fetchRemotar();
    return NextResponse.json({
      source: classified.kind,
      jobs,
      note: "Lista pública. A Prancheta não se candidata por você.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao buscar.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
