import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";
const key = () => {
  const secret = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) throw new Error("Set CREDENTIALS_ENCRYPTION_KEY (at least 32 random characters) on the server before saving WhatsApp credentials.");
  return createHash("sha256").update(secret).digest();
};
export function encryptCredential(value: string) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(":");
}
export function decryptCredential(value: string) {
  try {
    const [version, iv, tag, data] = value.split(":");
    if (version !== "v1" || !iv || !tag || !data) throw new Error("Invalid credential");
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
  } catch { throw new Error("WhatsApp credentials could not be unlocked. Check the server encryption key and save the access token again."); }
}
