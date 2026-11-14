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
  title: "Prancheta — currículo × vaga, sem inventar",
  description:
    "Guarde cada vaga. Veja o que falta no CV e no portfólio. No 7º dia, a gente te lembra. Nada é enviado daqui.",
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
