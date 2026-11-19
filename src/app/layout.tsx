import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource/schibsted-grotesk/latin-400.css";
import "@fontsource/schibsted-grotesk/latin-500.css";
import "@fontsource/schibsted-grotesk/latin-700.css";
import "@fontsource/commit-mono/latin-400.css";
import "@fontsource/commit-mono/latin-600.css";
import "./globals.css";
import { Shell } from "./shell";

export const metadata: Metadata = {
  robots: { index: true, follow: true },
  title: "VagaMatch — Descubra seu match real com a vaga antes do RH",
  description:
    "Compare seu currículo e portfólio com o anúncio da vaga usando evidência literal, descubra lacunas reais antes da entrevista e controle seus follow-ups D+7. Sem inventar nada no currículo.",
  openGraph: {
    title: "VagaMatch — Currículo × vaga com evidência literal",
    description:
      "Auditoria linha a linha do seu currículo e portfólio contra a vaga, sem inventar skills, com controle Kanban e lembretes D+7.",
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
