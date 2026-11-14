export type SourceKind = "greenhouse" | "remotar" | "blocked" | "manual";

export function classifyUrlOrToken(input: string): {
  kind: SourceKind;
  reason?: string;
  board?: string;
} {
  const raw = input.trim();
  if (!raw) return { kind: "manual" };
  const lower = raw.toLowerCase();
  if (lower.includes("linkedin.com") || lower.includes("lnkd.in")) {
    return {
      kind: "blocked",
      reason:
        "Não importamos LinkedIn (termos da plataforma proíbem coleta automatizada). Cole o texto do anúncio.",
    };
  }
  if (lower.includes("remotar.com.br") || lower === "remotar") {
    return { kind: "remotar" };
  }
  const gh = raw.match(/boards\.greenhouse\.io\/([a-z0-9_-]+)/i);
  if (gh) return { kind: "greenhouse", board: gh[1] };
  if (/^[a-z0-9_-]+$/i.test(raw) && !raw.includes(".")) {
    return { kind: "greenhouse", board: raw };
  }
  return {
    kind: "blocked",
    reason:
      "Fonte não suportada. Use o quadro Greenhouse (token ou URL), Remotar, ou cole o anúncio.",
  };
}

export type ImportedJob = {
  title: string;
  company: string;
  url: string;
  location: string;
  text: string;
  source: "greenhouse" | "remotar";
};

type GhJob = {
  id: number;
  title: string;
  absolute_url?: string;
  location?: { name?: string };
  content?: string;
};

export async function fetchGreenhouseBoard(
  board: string,
  fetcher: typeof fetch = fetch,
): Promise<ImportedJob[]> {
  const token = board.replace(/[^a-z0-9_-]/gi, "");
  if (!token) throw new Error("Token Greenhouse vazio.");
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`;
  const res = await fetcher(url, {
    headers: { Accept: "application/json", "User-Agent": "Prancheta/1.0" },
  });
  if (!res.ok) {
    throw new Error(`Greenhouse respondeu ${res.status}. Confira o token do quadro.`);
  }
  const data = (await res.json()) as { jobs?: GhJob[] };
  return (data.jobs ?? []).map((j) => ({
    title: j.title ?? "Sem título",
    company: token,
    url: j.absolute_url ?? `https://boards.greenhouse.io/${token}/jobs/${j.id}`,
    location: j.location?.name ?? "",
    text: stripHtml(j.content ?? j.title ?? ""),
    source: "greenhouse" as const,
  }));
}

type RemotarJob = {
  title?: string;
  company?: string | { name?: string };
  url?: string;
  location?: string;
  description?: string;
};

export async function fetchRemotar(
  fetcher: typeof fetch = fetch,
): Promise<ImportedJob[]> {
  const res = await fetcher("https://api.remotar.com.br/jobs?page=1", {
    headers: { Accept: "application/json", "User-Agent": "Prancheta/1.0" },
  });
  if (!res.ok) throw new Error(`Remotar respondeu ${res.status}.`);
  const data = (await res.json()) as { data?: RemotarJob[] } | RemotarJob[];
  const list = Array.isArray(data) ? data : (data.data ?? []);
  return list.map((j) => ({
    title: j.title ?? "Sem título",
    company: typeof j.company === "string" ? j.company : (j.company?.name ?? "Remotar"),
    url: j.url ?? "https://remotar.com.br",
    location: j.location ?? "",
    text: stripHtml(j.description ?? j.title ?? ""),
    source: "remotar" as const,
  }));
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
