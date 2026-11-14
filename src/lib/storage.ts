import { emptyStore, type Store } from "./types";

export const STORAGE_KEY = "prancheta.v1";

export function loadStore(): Store {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Store;
    if (parsed?.version !== 1) return emptyStore();
    return parsed;
  } catch {
    return emptyStore();
  }
}

export function saveStore(store: Store): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function wipeStore(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
