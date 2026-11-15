import type { Project } from "./types";

const STOP = new Set([
  "para", "com", "uma", "uns", "uma", "que", "the", "and", "for", "you", "our",
  "sua", "seu", "nao", "não", "are", "with", "this", "from", "will", "have",
  "mais", "como", "sobre", "anos", "ano", "experiencia", "experiência",
  "requisitos", "responsabilidades", "vaga", "empresa", "trabalho", "time",
]);

/** Palavras técnicas usadas para filtrar o anúncio. Não são acrescentadas ao currículo. */
export const TECH = [
  "react", "nextjs", "next.js", "typescript", "javascript", "html", "css",
  "node", "nodejs", "python", "vue", "angular", "svelte", "graphql", "rest",
  "sql", "postgres", "mysql", "mongodb", "redis", "aws", "gcp", "azure",
  "docker", "kubernetes", "git", "figma", "tailwind", "sass", "jest",
  "playwright", "cypress", "vitest", "n8n", "llm", "openai", "wake",
  "nuvemshop", "vtex", "scriban", "liquid", "php", "java", "golang", "go",
  "ruby", "rails", "django", "fastapi", "linux", "ci", "cd", "a11y",
  "acessibilidade", "seo", "webpack", "vite", "redux", "zustand",
];

export function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function tokenize(text: string): string[] {
  return fold(text)
    .replace(/next\.js/g, "nextjs")
    .replace(/node\.js/g, "nodejs")
    .split(/[^a-z0-9+#]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP.has(t));
}

function jobNeedles(jobText: string, requisitos: string[]): string[] {
  const extra = requisitos.map((r) => fold(r).trim()).filter(Boolean);
  const fromJob = tokenize(jobText).filter((t) =>
    TECH.some((skill) => skill.replace(".", "") === t || skill === t),
  );
  const all = [...extra.flatMap(tokenize), ...fromJob];
  return [...new Set(all)];
}

export type MatchResult = {
  score: number;
  present: string[];
  missing: string[];
  cvMentions: Array<{ term: string; quote: string; noNegativeMarker: boolean }>;
  compared: number;
  invented: false;
  ats: false;
  note: string;
};

export type EvidenceAnalysis = MatchResult & {
  /** Habilidades com menção textual e confirmação explícita do usuário. */
  inPortfolio: string[];
  onlyInPortfolio: string[];
  missingEverywhere: string[];
  portfolioSources: Record<string, string[]>;
  /** Trechos citados são menções não verificadas até confirmação explícita. */
  portfolioMentions: Array<{ term: string; projectId: string; projectName: string; projectUrl: string; quote: string; quotes: string[]; confirmed: boolean; confirmable: boolean }>;
  coverage: { job: number; cv: number; portfolio: number; either: number };
};

function quotedMentions(text: string, term: string): string[] {
  return (text.match(/[^.!?;\n]+(?:[.!?;]+|$)/g) || [])
    .map((sentence) => sentence.trim())
    .filter((sentence) => tokenize(sentence).includes(term))
    .map((sentence) => sentence.length > 240 ? `${sentence.slice(0, 237).trimEnd()}…` : sentence);
}

function hasNonAffirmativeMarker(quote: string, term: string): boolean {
  const normalized = fold(quote).replace(/next\.js/g, "nextjs").replace(/node\.js/g, "nodejs");
  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const termMatch = new RegExp(`(?:^|[^a-z0-9+#])${escapedTerm}(?=$|[^a-z0-9+#])`).exec(normalized);
  if (!termMatch) return false;
  const context = normalized;
  return [
    /\b(?:talvez|possivelmente|maybe|possibly|might|would|learning)\b/,
    /\b(?:i\s+)?(?:want|hope|plan|intend|wish|will)\s+(?:to\s+)?(?:learn|study|use|work\s+with|know)\b/,
    /\b(?:i\s+)?(?:am\s+)?learning\b/,
    /\b(?:quero|queria|gostaria de|busco|planejo|pretendo)\s+(?:muito\s+)?(?:aprender|estudar|usar|trabalhar|conhecer)\b/,
    /\b(?:aprendendo|estudando)\b/,
    /\b(?:no|without)\s+(?:prior\s+)?experience\b/,
    /\bsem\s+(?:experiencia|vivencia|uso|conhecimento)\b/,
    /\b(?:nao|nunca)\s+(?:tenho|uso|utilizo|usei|trabalhei|conheco|conheci)\b/,
    /\b(?:i\s+)?(?:do\s+not|don't|dont|never)\s+(?:use|work\s+with|know|have\s+experience\s+with)\b/,
    /\b(?:not|never)\s+(?:used|worked|learned|know)\b/,
    /\b(?:haven[' ]t|hasn[' ]t|didn[' ]t|don[' ]t|doesn[' ]t)\b/,
  ].some((marker) => marker.test(context));
}

export function matchCvToJob(
  cvText: string,
  jobText: string,
  requisitos: string[] = [],
): MatchResult {
  const needs = jobNeedles(jobText, requisitos);
  const cvMentions = needs.flatMap((term) => quotedMentions(cvText, term).map((quote) => ({
    term,
    quote,
    noNegativeMarker: !hasNonAffirmativeMarker(quote, term),
  })));
  const present = needs.filter((term) => cvMentions.some((mention) => mention.term === term && mention.noNegativeMarker));
  const presentSet = new Set(present);
  const missing = needs.filter((n) => !presentSet.has(n));
  const compared = needs.length;
  const score = compared === 0 ? 0 : Math.round((present.length / compared) * 100);
  return {
    score,
    present,
    missing,
    cvMentions,
    compared,
    invented: false,
    ats: false,
    note:
      compared === 0
        ? "Não há requisitos técnicos reconhecidos. Escreva um por linha no campo Requisitos."
        : "Só comparamos o que está no texto que você colou. Nada foi acrescentado ao currículo. Não é ATS.",
  };
}

export function portfolioCorpus(profile: {
  portfolioUrl?: string;
  projects?: Array<{ name?: string; url?: string; whatIDid?: string }>;
}): string {
  const projects = profile.projects || [];
  // Links are destinations, not evidence of the skills written in a project.
  return projects.map((p) => p.whatIDid || "").join(" ");
}

export function confirmableProjectQuote(description: string, term: string): string | undefined {
  return quotedMentions(description, term).find((quote) => !hasNonAffirmativeMarker(quote, term));
}

export function isPortfolioUseConfirmed(project: Project, term: string): boolean {
  return Boolean(confirmableProjectQuote(project.whatIDid, term))
    && project.confirmedSkills?.some((skill) => tokenize(skill).includes(term)) === true
    && project.confirmedSkillDescriptions?.[term] === project.whatIDid;
}

export function analyzeEvidence(
  cvText: string,
  jobText: string,
  requisitos: string[] = [],
  profile: { portfolioUrl?: string; projects?: Project[] } = {},
): EvidenceAnalysis {
  const match = matchCvToJob(cvText, jobText, requisitos);
  const needs = [...match.present, ...match.missing];
  const port = new Set(tokenize(portfolioCorpus(profile)));
  const projects = profile.projects || [];
  const portfolioMentions = needs.flatMap((term) => projects.flatMap((project) => {
    const quotes = quotedMentions(project.whatIDid || "", term);
    if (!quotes.length) return [];
    const confirmationQuote = confirmableProjectQuote(project.whatIDid || "", term);
    const quote = confirmationQuote || quotes[0];
    const confirmable = Boolean(confirmationQuote);
    const confirmed = isPortfolioUseConfirmed(project, term);
    return [{
      term,
      projectId: project.id || project.name || term,
      projectName: project.name?.trim() || "projeto sem nome",
      projectUrl: project.url?.trim() || "",
      quote,
      quotes,
      confirmed,
      confirmable,
    }];
  }));
  const confirmedMentions = portfolioMentions.filter((mention) => mention.confirmed);
  const portfolioSources = Object.fromEntries(needs.flatMap((term) => {
    const sources = confirmedMentions.filter((mention) => mention.term === term).map((mention) => mention.projectName);
    return sources.length ? [[term, [...new Set(sources)]]] : [];
  }));
  const inCv = match.present;
  const inPortfolio = [...new Set(confirmedMentions.map((mention) => mention.term))];
  const onlyInPortfolio = inPortfolio.filter((n) => !inCv.includes(n));
  const missingEverywhere = match.missing.filter((n) => !port.has(n) && !match.cvMentions.some((mention) => mention.term === n));
  const either = needs.filter((n) => inCv.includes(n) || port.has(n));
  return {
    ...match,
    ats: false,
    inPortfolio,
    onlyInPortfolio,
    missingEverywhere,
    portfolioSources,
    portfolioMentions,
    coverage: {
      job: needs.length,
      cv: inCv.length,
      portfolio: new Set(portfolioMentions.map((mention) => mention.term)).size,
      either: either.length,
    },
    note:
      match.compared === 0
        ? match.note
        : "N\u00e3o \u00e9 ATS nem ranking de entrevista. Men\u00e7\u00f5es no portf\u00f3lio n\u00e3o s\u00e3o verificadas; confirme o uso antes de contar essa habilidade. Nada \u00e9 copiado ao CV automaticamente.",
  };
}
