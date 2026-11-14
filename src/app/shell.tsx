"use client";

import type { ReactNode } from "react";
import { Chrome } from "./chrome";
import { StoreProvider, usePranchetaStore } from "./store-provider";

function Ready({ children }: { children: ReactNode }) {
  const { ready } = usePranchetaStore();
  if (!ready) {
    return <p className="muted">Abrindo o caderno neste navegador…</p>;
  }
  return <>{children}</>;
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <div className="wrap">
        <Chrome />
        <div id="conteudo">
          <Ready>{children}</Ready>
        </div>
      </div>
    </StoreProvider>
  );
}
