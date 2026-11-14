import { capJobs, clipText } from "./limits";

export type SourceKind = "greenhouse" | "remotar" | "lever" | "blocked" | "manual";

export function classifyUrlOrToken(input: string): {
  kind: SourceKind;
  reason?: string;
  board?: string;
} {
  const raw = input.trim();
  if (!raw) {
    return {
      kind: "manual",
      reason: "Informe Greenhouse, remotar, lever:quadro, ou cole o anúncio.",
    };
  }
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
  const lever = raw.match(/^(?:lever:|https?:\/\/(?:www\.)?jobs\.lever\.co\/)([a-z0-9-]+)(?:\/|$)/i);
  if (lever) return { kind: "lever", board: lever[1] };
  const gh = raw.match(/boards\.greenhouse\.io\/([a-z0-9_-]+)/i);
  if (gh) return { kind: "greenhouse", board: gh[1] };
  if (/^[a-z0-9_-]+$/i.test(raw) && !raw.includes(".")) {
    return { kind: "greenhouse", board: raw };
  }
  return {
    kind: "blocked",
    reason:
      "Fonte não suportada. Use Greenhouse, Remotar, lever:quadro, ou cole o anúncio.",
  };
}

export type ImportedJob = {
  title: string;
  company: string;
  url: string;
  location: string;
  text: string;
  source: "greenhouse" | "remotar" | "lever";
};

export type ImportResult = {
  jobs: ImportedJob[];
  total: number;
  capped: boolean;
};

type GhJob = {
  id: number;
  title: string;
  absolute_url?: string;
  location?: { name?: string };
  content?: string;
};

const FETCH_MS = 12_000;

export async function fetchGreenhouseBoard(
  board: string,
  fetcher: typeof fetch = fetch,
): Promise<ImportResult> {
  const token = board.replace(/[^a-z0-9_-]/gi, "");
  if (!token) throw new Error("Token Greenhouse vazio.");
  // Sem content=true: o quadro Stripe passa de 4 MB e estoura a função.
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs`;
  const res = await fetcher(url, {
    headers: { Accept: "application/json", "User-Agent": "Prancheta/1.0" },
    signal: AbortSignal.timeout(FETCH_MS),
    redirect: "error",
  });
  if (!res.ok) {
    throw new Error(`Greenhouse respondeu ${res.status}. Confira o token do quadro.`);
  }
  const data = (await res.json()) as { jobs?: GhJob[] };
  const mapped = (data.jobs ?? []).map((j) => ({
    title: j.title ?? "Sem título",
    company: token,
    url: j.absolute_url ?? `https://boards.greenhouse.io/${token}/jobs/${j.id}`,
    location: j.location?.name ?? "",
    text: clipText(
      [j.title, j.location?.name, "Abra o anúncio para o texto completo; a lista pública não traz o HTML inteiro."]
        .filter(Boolean)
        .join(". "),
    ),
    source: "greenhouse" as const,
  }));
  return capJobs(mapped);
}

type RemotarJob = {
  id?: number;
  title?: string;
  company?: string | { name?: string };
  companyDisplayName?: string | null;
  url?: string;
  externalLink?: string | null;
  city?: string;
  state?: string;
  location?: string;
  description?: string;
};

type LeverJob = {
  text?: string;
  hostedUrl?: string;
  descriptionPlain?: string;
  descriptionBodyPlain?: string;
  openingPlain?: string;
  lists?: Array<{ text?: string; content?: string }>;
  categories?: { location?: string; allLocations?: string[] };
};

export async function fetchLeverBoard(
  board: string,
  fetcher: typeof fetch = fetch,
): Promise<ImportResult> {
  const slug = board.toLowerCase();
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("Identificador Lever inválido.");
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json&limit=41`;
  const res = await fetcher(url, {
    headers: { Accept: "application/json", "User-Agent": "Prancheta/1.0" },
    signal: AbortSignal.timeout(FETCH_MS),
    redirect: "error",
  });
  if (!res.ok) throw new Error(`Lever respondeu ${res.status}. Confira o quadro público.`);
  const jobs = (await res.json()) as LeverJob[];
  if (!Array.isArray(jobs)) throw new Error("Resposta Lever em formato inesperado.");
  const mapped = jobs.map((job) => {
    const requirements = (job.lists ?? [])
      .map((list) => [list.text?.trim(), list.content ? stripHtml(list.content) : ""].filter(Boolean).join(": "))
      .filter(Boolean);
    const description = [job.descriptionPlain, job.descriptionBodyPlain, job.openingPlain, job.text]
      .find((part) => part?.trim()) ?? "";
    return {
      title: job.text ?? "Sem título",
      company: slug,
      url: job.hostedUrl ?? "",
      location: job.categories?.allLocations?.join(", ") ?? job.categories?.location ?? "",
      text: clipText(stripHtml([...requirements, description].filter(Boolean).join("\n"))),
      source: "lever" as const,
    };
  });
  return capJobs(mapped);
}

export function remotarJobUrl(j: RemotarJob): string {
  const external = (j.externalLink || j.url || "").trim();
  if (external) return external;
  if (j.id) return `https://remotar.com.br/vaga/${j.id}`;
  return "";
}

export async function fetchRemotar(
  fetcher: typeof fetch = fetch,
): Promise<ImportResult> {
  const res = await fetcher("https://api.remotar.com.br/jobs?page=1", {
    headers: { Accept: "application/json", "User-Agent": "Prancheta/1.0" },
    signal: AbortSignal.timeout(FETCH_MS),
  });
  if (!res.ok) throw new Error(`Remotar respondeu ${res.status}.`);
  const data = (await res.json()) as { data?: RemotarJob[] } | RemotarJob[];
  const list = Array.isArray(data) ? data : (data.data ?? []);
  const mapped = list.map((j) => ({
    title: j.title ?? "Sem título",
    company:
      typeof j.company === "string"
        ? j.company
        : (j.company?.name ?? j.companyDisplayName ?? "Remotar"),
    url: remotarJobUrl(j),
    location: j.location ?? [j.city, j.state].filter(Boolean).join("/") ?? "",
    text: clipText(stripHtml(j.description ?? j.title ?? "")),
    source: "remotar" as const,
  }));
  return capJobs(mapped);
}

function stripHtml(html: string): string {
  const text = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<\s*li\b[^>]*>/gi, " • ")
    .replace(/<\s*br\b[^>]*\/?>/gi, " ")
    .replace(/<\s*\/\s*(p|div|li|h[1-6]|tr)\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ");
  return text.replace(/\s+/g, " ").trim();
}
