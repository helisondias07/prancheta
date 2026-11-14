"use client";

import { useState } from "react";
import { MAX_PDF_BYTES } from "@/lib/limits";
import { extractPdfText } from "@/lib/pdf-extract";
import { usePranchetaStore } from "../store-provider";

const EXAMPLE_CV = `Exemplo (não é uma pessoa real)
Ana Costa — desenvolvedora frontend.
React, TypeScript, HTML, CSS, testes com Vitest.
Projeto: loja de demonstração em Next.js.`;

export function CurriculoClient() {
  const { store, setStore } = usePranchetaStore();
  const [pdfMsg, setPdfMsg] = useState("");

  async function onPdf(file: File | undefined) {
    if (!file) return;
    setPdfMsg("");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = extractPdfText(bytes);
    if (!result.ok) {
      setPdfMsg(result.message);
      return;
    }
    setStore((s) => ({ ...s, profile: { ...s.profile, cvText: result.text } }));
    setPdfMsg(
      `${result.chars} caracteres extraídos neste navegador. O PDF não foi enviado a servidor e não ficou salvo — só o texto. Cole à mão se o resultado estiver incompleto.`,
    );
  }

  return (
    <section className="paper">
      <h2>Currículo</h2>
      <p className="muted">
        Cole o texto ou escolha um PDF <strong>com texto selecionável</strong>. Scan/imagem falha de propósito
        (não há OCR). Teto {Math.round(MAX_PDF_BYTES / 1024 / 1024)} MB. O arquivo não sobe ao Hobby.
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
      <label htmlFor="pdf">PDF local (opcional; fallback = colar texto)</label>
      <input
        id="pdf"
        type="file"
        accept="application/pdf,.pdf"
        onChange={(e) => {
          void onPdf(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {pdfMsg ? (
        <p className={pdfMsg.includes("caracteres extraídos") ? "muted" : "error-summary bad"} role="status">
          {pdfMsg}
        </p>
      ) : null}
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
