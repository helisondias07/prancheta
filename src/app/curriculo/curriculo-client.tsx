"use client";

import { usePranchetaStore } from "../store-provider";

const EXAMPLE_CV = `Exemplo (não é uma pessoa real)
Ana Costa — desenvolvedora frontend.
React, TypeScript, HTML, CSS, testes com Vitest.
Projeto: loja de demonstração em Next.js.`;

export function CurriculoClient() {
  const { store, setStore } = usePranchetaStore();

  return (
    <section className="paper">
      <h2>Currículo</h2>
      <p className="muted">
        Cole o texto. Não lemos PDF da sua máquina e não acrescentamos skill que não está aqui.
      </p>
      <label htmlFor="nome">Nome como você quer aparecer no rascunho</label>
      <input
        id="nome"
        value={store.profile.displayName}
        onChange={(e) =>
          setStore((s) => ({ ...s, profile: { ...s.profile, displayName: e.target.value } }))
        }
      />
      <label htmlFor="headline">Linha de apresentação (opcional)</label>
      <input
        id="headline"
        value={store.profile.headline}
        onChange={(e) =>
          setStore((s) => ({ ...s, profile: { ...s.profile, headline: e.target.value } }))
        }
      />
      <label htmlFor="cv">Texto do currículo</label>
      <textarea
        id="cv"
        value={store.profile.cvText}
        onChange={(e) =>
          setStore((s) => ({ ...s, profile: { ...s.profile, cvText: e.target.value } }))
        }
      />
      <button
        className="sec"
        type="button"
        onClick={() =>
          setStore((s) => ({
            ...s,
            profile: {
              ...s.profile,
              displayName: "Ana Costa",
              headline: "Frontend (exemplo)",
              cvText: EXAMPLE_CV,
            },
          }))
        }
      >
        Carregar currículo de exemplo
      </button>
    </section>
  );
}
