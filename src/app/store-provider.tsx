"use client";

import { createContext, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { loadStore, saveStore } from "@/lib/storage";
import { emptyStore, type Store } from "@/lib/types";

type StoreContextValue = {
  store: Store;
  setStore: Dispatch<SetStateAction<Store>>;
  ready: boolean;
};

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>(emptyStore);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setStore(loadStore());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveStore(store);
  }, [store, ready]);

  return <StoreContext.Provider value={{ store, setStore, ready }}>{children}</StoreContext.Provider>;
}

export function usePranchetaStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("usePranchetaStore precisa do StoreProvider");
  return ctx;
}
