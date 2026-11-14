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
  compared: number;
  invented: false;
  note: string;
};

export function matchCvToJob(
  cvText: string,
  jobText: string,
  requisitos: string[] = [],
): MatchResult {
  const cv = new Set(tokenize(cvText));
  const needs = jobNeedles(jobText, requisitos);
  const present = needs.filter((n) => cv.has(n));
  const presentSet = new Set(present);
  const missing = needs.filter((n) => !presentSet.has(n));
  const compared = needs.length;
  const score = compared === 0 ? 0 : Math.round((present.length / compared) * 100);
  return {
    score,
    present,
    missing,
    compared,
    invented: false,
    note:
      compared === 0
        ? "Não há requisitos técnicos reconhecidos. Escreva um por linha no campo Requisitos."
        : "Só comparamos o que está no texto que você colou. Nada foi acrescentado ao currículo.",
  };
}
