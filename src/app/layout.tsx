import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource/atkinson-hyperlegible/latin-400.css";
import "@fontsource/atkinson-hyperlegible/latin-700.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "@fontsource/source-serif-4/latin-400.css";
import "@fontsource/source-serif-4/latin-600.css";
import "./globals.css";
import { Shell } from "./shell";

export const metadata: Metadata = {
  robots: { index: true, follow: true },
  title: "Prancheta — Compare currículo e portfólio com a vaga sem inventar",
  description:
    "Compare seu currículo e portfólio com o anúncio da vaga usando evidência literal, descubra lacunas reais antes da entrevista e controle seus follow-ups D+7.",
  openGraph: {
    title: "Prancheta — Currículo × vaga com evidência literal",
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
