import type { Profile } from "./types";
import type { EvidenceAnalysis, MatchResult } from "./match";

export function draftMessage(input: {
  profile: Profile;
  jobTitle: string;
  company: string;
  jobUrl: string;
  match: MatchResult | EvidenceAnalysis;
}): { body: string; sent: false } {
  const name = input.profile.displayName.trim();
  const greeting = name ? `Olá, sou ${name}.` : "Olá.";
  const skills = input.match.present.slice(0, 8).join(", ");
  const projects = input.profile.projects
    .filter((p) => p.url && p.whatIDid)
    .slice(0, 3)
    .map((p) => `- ${p.name}: ${p.whatIDid} (${p.url})`)
    .join("\n");
  const portfolio = input.profile.portfolioUrl.trim();

  const lines = [
    greeting,
    "",
    `Vi a vaga “${input.jobTitle}”${input.company ? ` na ${input.company}` : ""}.`,
    skills
      ? `No currículo que eu mesmo colei constam: ${skills}.`
      : "Não marquei sobreposição técnica suficiente no texto colado — não inventei skills.",
  ];
  const onlyPort = "onlyInPortfolio" in input.match ? input.match.onlyInPortfolio : [];
  if (projects) {
    lines.push("", "Projetos que cadastrei:", projects);
  }
  if (onlyPort.length) {
    lines.push(
      "",
      `No portfólio cadastrado (não está no CV): ${onlyPort.join(", ")}. Não acrescentei isso ao currículo.`,
    );
  }
  if (portfolio) {
    lines.push("", `Portfólio: ${portfolio}`);
  }
  if (input.jobUrl) {
    lines.push("", `Link da vaga: ${input.jobUrl}`);
  }
  lines.push(
    "",
    "Esta mensagem foi só rascunhada na Prancheta. Não foi enviada. Copie e envie você, se quiser.",
  );
  return { body: lines.join("\n"), sent: false };
}
