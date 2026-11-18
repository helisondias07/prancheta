"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const landing = pathname === "/";

  return (
    <StoreProvider>
      {landing ? (
        <>{children}</>
      ) : (
        <div className="wrap">
          <Chrome />
          <main id="conteudo">
            <Ready>{children}</Ready>
          </main>
        </div>
      )}
    </StoreProvider>
  );
}
