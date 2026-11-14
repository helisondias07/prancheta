import { safeExternalHttpUrl } from "./provenance";

export type PublicLink = {
  label: string;
  href: string;
  note: string;
};

/** Dois atalhos públicos para a pessoa abrir. Não é Easy Apply nem LinkedIn automatizado. */
export function publicJobLinks(job: { title?: string; company?: string; url?: string }): PublicLink[] {
  const links: PublicLink[] = [];
  const url = safeExternalHttpUrl(job.url || "");
  if (url) {
    links.push({
      label: "Anúncio (você abre)",
      href: url,
      note: "Link que você guardou. Esta app não envia candidatura.",
    });
  }
  const parts = [job.company, job.title].map((p) => p?.trim()).filter(Boolean);
  if (parts.length) {
    const query = [...parts, "vaga"].join(" ");
    links.push({
      label: "Busca pública no Google (você abre)",
      href: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      note: "Só uma busca. Não logamos em ATS e não abrimos LinkedIn por aqui.",
    });
  }
  return links;
}
