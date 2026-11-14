"use client";

import { usePathname } from "next/navigation";
import { dashboardSnapshot } from "@/lib/dashboard";
import { usePranchetaStore } from "./store-provider";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/curriculo", label: "Currículo" },
  { href: "/vagas", label: "Vagas" },
  { href: "/portfolio", label: "Portfólio" },
  { href: "/historico", label: "Histórico" },
];

export function Chrome() {
  const pathname = usePathname();
  const { store, ready } = usePranchetaStore();
  const due = ready ? dashboardSnapshot(store).dueFollowups.length : 0;

  return (
    <>
      <a className="skip" href="#conteudo">
        Ir para o conteúdo
      </a>
      <header className="site">
        <div>
          <h1>Prancheta</h1>
          <p className="lede">
            Currículo, vaga, portfólio e histórico neste navegador. Nada é enviado daqui. Nada é inventado
            no currículo.
          </p>
          <p className="muted">
            {ready ? (due ? `${due} no D+7` : "nenhum D+7") : "…"} · marca provisória, não é registro.
          </p>
        </div>
        <nav>
          <a href="/privacidade">Privacidade</a>
          <a href="https://github.com/helisondias07/prancheta">Código</a>
        </nav>
      </header>
      <nav className="main-nav" aria-label="Seções">
        {LINKS.map((link) => {
          const current = pathname === link.href;
          return (
            <a key={link.href} href={link.href} aria-current={current ? "page" : undefined}>
              {link.label}
            </a>
          );
        })}
      </nav>
      <p className="banner" role="note">
        Dados só neste navegador. Fontes públicas importáveis por quadro: Greenhouse, Remotar, Lever e Ashby.
        LinkedIn não é importado.
        Vercel Hobby — uso pessoal ou não comercial (
        <a href="https://vercel.com/legal/terms">Termos §4</a>
        ). Não há pagamento aqui.
      </p>
    </>
  );
}
