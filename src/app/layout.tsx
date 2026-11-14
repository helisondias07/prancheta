import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prancheta — currículo × vaga, sem inventar",
  description:
    "Compare o texto do seu currículo com o anúncio, registre candidaturas e rascunhe mensagens. Nada é enviado daqui.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
