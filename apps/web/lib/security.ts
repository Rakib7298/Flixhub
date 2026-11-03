import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";

function encryptionKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET with at least 32 characters is required for encrypted source storage.");
  return createHash("sha256").update(`mediamatrix-source-encryption:${secret}`).digest();
}

export function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptSecret(ciphertext: string): string {
  const [version, ivValue, tagValue, payload] = ciphertext.split(".");
  if (version !== "v1" || !ivValue || !tagValue || !payload) throw new Error("Invalid encrypted value.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(payload, "base64url")), decipher.final()]).toString("utf8");
}

export function sensitiveHash(value: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET is required for source fingerprinting.");
  return createHmac("sha256", `mediamatrix-source-hash:${secret}`).update(value).digest("hex");
}

export function safeSourceLabel(value: string): string {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return "Configured source";
  }
}

export function hashIpForAudit(ip: string): string {
  return sensitiveHash(`audit-ip:${ip}`).slice(0, 32);
}
