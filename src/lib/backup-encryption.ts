import { MAX_BACKUP_BYTES } from "./backup";

export const MIN_BACKUP_PASSPHRASE_LENGTH = 12;
export const MAX_ENCRYPTED_BACKUP_BYTES = Math.ceil(((MAX_BACKUP_BYTES + 16 + 1024) * 4) / 3) + 2048;

const FORMAT = "prancheta-encrypted-backup";
const VERSION = 1;
const ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

type EncryptedBackup = {
  format: typeof FORMAT;
  version: typeof VERSION;
  kdf: { name: "PBKDF2-SHA-256"; iterations: typeof ITERATIONS; salt: string };
  cipher: { name: "AES-256-GCM"; iv: string; data: string };
};

function cryptoApi(): Crypto {
  if (!globalThis.crypto?.subtle) throw new Error("Este navegador não oferece criptografia local compatível.");
  return globalThis.crypto;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function fromBase64(value: unknown): Uint8Array {
  if (typeof value !== "string" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error("Formato do backup criptografado inválido.");
  }
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isEncryptedBackup(text: string): boolean {
  try {
    const parsed: unknown = JSON.parse(text);
    return isRecord(parsed) && parsed.format === FORMAT;
  } catch {
    return false;
  }
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const crypto = cryptoApi();
  const material = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(new TextEncoder().encode(passphrase)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: toArrayBuffer(salt), iterations: ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptBackup(plainText: string, passphrase: string): Promise<string> {
  const length = [...passphrase].length;
  if (length < MIN_BACKUP_PASSPHRASE_LENGTH || length > 256) {
    throw new Error(`Use uma frase-senha de ${MIN_BACKUP_PASSPHRASE_LENGTH} a 256 caracteres.`);
  }
  const encoded = new TextEncoder().encode(plainText);
  if (encoded.byteLength > MAX_BACKUP_BYTES) throw new Error("O backup excede o limite de 5 MB.");

  const crypto = cryptoApi();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: toArrayBuffer(iv) }, key, toArrayBuffer(encoded));
  const result: EncryptedBackup = {
    format: FORMAT,
    version: VERSION,
    kdf: { name: "PBKDF2-SHA-256", iterations: ITERATIONS, salt: toBase64(salt) },
    cipher: { name: "AES-256-GCM", iv: toBase64(iv), data: toBase64(new Uint8Array(encrypted)) },
  };
  const text = `${JSON.stringify(result, null, 2)}\n`;
  if (new TextEncoder().encode(text).byteLength > MAX_ENCRYPTED_BACKUP_BYTES) {
    throw new Error("O backup criptografado excede o limite deste recurso.");
  }
  return text;
}

export async function decryptBackup(text: string, passphrase: string): Promise<string> {
  if (new TextEncoder().encode(text).byteLength > MAX_ENCRYPTED_BACKUP_BYTES) {
    throw new Error("O arquivo criptografado excede o limite deste recurso.");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Arquivo criptografado inválido.");
  }
  if (!isRecord(raw) || raw.format !== FORMAT || raw.version !== VERSION ||
      !isRecord(raw.kdf) || raw.kdf.name !== "PBKDF2-SHA-256" || raw.kdf.iterations !== ITERATIONS ||
      !isRecord(raw.cipher) || raw.cipher.name !== "AES-256-GCM") {
    throw new Error("Formato de backup criptografado não reconhecido.");
  }
  if ([...passphrase].length > 256) throw new Error("Frase-senha inválida.");

  const salt = fromBase64(raw.kdf.salt);
  const iv = fromBase64(raw.cipher.iv);
  const data = fromBase64(raw.cipher.data);
  if (salt.length !== SALT_BYTES || iv.length !== IV_BYTES || data.length < 16) {
    throw new Error("Formato de backup criptografado inválido.");
  }

  let plain: ArrayBuffer;
  try {
    const key = await deriveKey(passphrase, salt);
    plain = await cryptoApi().subtle.decrypt({ name: "AES-GCM", iv: toArrayBuffer(iv) }, key, toArrayBuffer(data));
  } catch {
    throw new Error("Frase-senha incorreta ou arquivo danificado. Os dados atuais continuam intactos.");
  }
  if (plain.byteLength > MAX_BACKUP_BYTES) throw new Error("O backup descriptografado excede o limite de 5 MB.");
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(plain);
  } catch {
    throw new Error("Frase-senha incorreta ou arquivo danificado. Os dados atuais continuam intactos.");
  }
}
