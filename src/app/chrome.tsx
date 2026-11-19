"use client";

import { usePathname } from "next/navigation";
import { dashboardSnapshot } from "@/lib/dashboard";
import { usePranchetaStore } from "./store-provider";

const LINKS = [
  { href: "/app", label: "Painel" },
  { href: "/curriculo", label: "Currículo" },
  { href: "/vagas", label: "Vagas" },
  { href: "/portfolio", label: "Portfólio" },
  { href: "/historico", label: "Histórico" },
  { href: "/conta", label: "Conta" },
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
          <h1>
            <a
              href="/"
              style={{
                color: "inherit",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                minHeight: "44px",
              }}
            >
              Vaga<span style={{ color: "var(--vm-evidence)" }}>Match</span>
            </a>
          </h1>
          <p className="lede">
            Descubra seu match real com a vaga antes do RH. Compare seu currículo e portfólio com a vaga usando evidência literal — sem inventar skills — e controle seus follow-ups D+7.
          </p>
          <p className="muted">
            {ready ? (due ? `${due} follow-up(s) pendente(s) no D+7` : "Nenhum follow-up pendente no D+7") : "…"} · funciona agora neste navegador, sem exigir cadastro.
          </p>
        </div>
        <nav aria-label="Institucional">
          <a href="/privacidade">Privacidade</a>
          <a href="/conta">Sincronizar em nuvem</a>
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
        Seus dados ficam neste navegador por padrão, com cópia e sincronização opcionais em Conta. Fontes públicas importáveis por quadro: Greenhouse, Remotar, Lever e Ashby (LinkedIn não é importado).
      </p>
    </>
  );
}
