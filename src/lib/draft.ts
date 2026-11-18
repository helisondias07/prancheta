import type { Profile } from "./types";
import type { EvidenceAnalysis, MatchResult } from "./match";
import { isPortfolioUseConfirmed } from "./match";

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
  const onlyPort = "onlyInPortfolio" in input.match ? input.match.onlyInPortfolio : [];
  const projects = input.profile.projects
    .filter((project) => project.confirmedSkills?.some((skill) =>
      onlyPort.includes(skill.toLowerCase()) && isPortfolioUseConfirmed(project, skill.toLowerCase())))
    .slice(0, 3)
    .map((project) => {
      const skills = [...new Set((project.confirmedSkills || [])
        .map((skill) => skill.toLowerCase())
        .filter((skill) => onlyPort.includes(skill) && isPortfolioUseConfirmed(project, skill)))];
      return `- ${project.name}: uso confirmado por voc\u00ea de ${skills.join(", ")}${project.url ? ` (${project.url})` : ""}`;
    })
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
  if (projects) {
    lines.push("", "Projetos com uso confirmado por mim:", projects);
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
    "Esta mensagem foi só rascunhada na VagaMatch. Não foi enviada. Copie e envie você, se quiser.",
  );
  return { body: lines.join("\n"), sent: false };
}

export function draftFollowUpMessage(input: { jobTitle: string; company: string }): { body: string; sent: false } {
  const title = input.jobTitle.trim() || "esta vaga";
  const company = input.company.trim();
  const vacancy = company ? `vaga de ${title} na ${company}` : `vaga de ${title}`;
  return {
    body: [
      "Olá, tudo bem?",
      "",
      `Gostaria de saber se há alguma atualização sobre o processo para a ${vacancy}.`,
      "",
      "Agradeço desde já.",
      "",
      "Rascunho local da VagaMatch. Não foi enviado; revise e envie você, se quiser.",
    ].join("\n"),
    sent: false,
  };
}
