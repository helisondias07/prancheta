import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { emptyStore } from "./types";
import { parseBackup, serializeBackup } from "./backup";
import { decryptBackup, encryptBackup, isEncryptedBackup, MAX_ENCRYPTED_BACKUP_BYTES, MIN_BACKUP_PASSPHRASE_LENGTH } from "./backup-encryption";

const passphrase = "caderno local seguro 2026";
const dashboard = readFileSync(path.resolve(__dirname, "../app/dashboard-client.tsx"), "utf8");

describe("backup criptografado local", () => {
  it("cripta e restaura o JSON sem deixar currículo em texto no envelope", async () => {
    const store = emptyStore();
    store.profile.cvText = "CV fictício não deve aparecer no arquivo";
    const plain = serializeBackup(store);
    const encrypted = await encryptBackup(plain, passphrase);

    expect(isEncryptedBackup(encrypted)).toBe(true);
    expect(encrypted).not.toContain(store.profile.cvText);
    expect(new TextEncoder().encode(encrypted).byteLength).toBeLessThanOrEqual(MAX_ENCRYPTED_BACKUP_BYTES);
    expect(parseBackup(await decryptBackup(encrypted, passphrase))).toEqual({ ok: true, store });
  });

  it("rejeita frase-senha errada e arquivo alterado sem texto parcial", async () => {
    const encrypted = await encryptBackup(serializeBackup(emptyStore()), passphrase);
    await expect(decryptBackup(encrypted, "outra frase-senha longa"))
      .rejects.toThrow("Frase-senha incorreta ou arquivo danificado");
    const changed = encrypted.replace('"version": 1', '"version": 2');
    await expect(decryptBackup(changed, passphrase)).rejects.toThrow("não reconhecido");
  });

  it("valida tamanho da senha, limites do arquivo e formato da chave derivada", async () => {
    await expect(encryptBackup("{}", "curta")).rejects.toThrow(`de ${MIN_BACKUP_PASSPHRASE_LENGTH} a 256 caracteres`);
    await expect(encryptBackup("{}", "x".repeat(257))).rejects.toThrow("256 caracteres");
    await expect(decryptBackup("x".repeat(MAX_ENCRYPTED_BACKUP_BYTES + 1), passphrase))
      .rejects.toThrow("excede o limite");
    const encrypted = JSON.parse(await encryptBackup("{}", passphrase));
    encrypted.kdf.iterations += 1;
    await expect(decryptBackup(JSON.stringify(encrypted), passphrase)).rejects.toThrow("não reconhecido");
  });

  it("rotula os campos, associa as instruções e anuncia falhas", () => {
    expect(dashboard).toContain('htmlFor="backup-passphrase"');
    expect(dashboard).toContain('aria-describedby="backup-encryption-help"');
    expect(dashboard).toContain('htmlFor="backup-restore-passphrase"');
    expect(dashboard).toContain('aria-describedby="backup-restore-help"');
    expect(dashboard).toContain('role={backupError ? "alert" : "status"}');
    expect(dashboard).toContain("A frase-senha não é guardada nem enviada.");
  });
});
