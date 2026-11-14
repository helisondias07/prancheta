import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Atkinson_Hyperlegible, IBM_Plex_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { Shell } from "./shell";

const serif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-serif-loaded",
  display: "swap",
});
const sans = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-sans-loaded",
  display: "swap",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-loaded",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Prancheta — currículo × vaga, sem inventar",
  description:
    "Guarde cada vaga. Veja o que falta no CV e no portfólio. No 7º dia, a gente te lembra. Nada é enviado daqui.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
