import { describe, expect, it } from "vitest";
import { decryptBackup, encryptBackup } from "./backup-encryption";
import { parseBackup, serializeBackup } from "./backup";
import { emptyStore } from "./types";

describe("encrypted remote snapshot export", () => {
  it("round trips a validated snapshot and rejects a wrong passphrase", async () => {
    const snapshot = emptyStore(); snapshot.profile.cvText = "Currículo fictício";
    const parsed = parseBackup(JSON.stringify(snapshot)); expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("fixture inválida");
    const encrypted = await encryptBackup(serializeBackup(parsed.store), "frase de teste segura");
    expect(encrypted).not.toContain("Currículo fictício");
    expect(parseBackup(await decryptBackup(encrypted, "frase de teste segura"))).toEqual({ ok: true, store: snapshot });
    await expect(decryptBackup(encrypted, "outra frase incorreta")).rejects.toThrow();
  });
});
