export const SESSION_DURATION_DAYS = 30;
export const SESSION_COOKIE = "budget_session";

async function hmacKey(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET ?? "";
  if (secret.length < 32) throw new Error("SESSION_SECRET in .env.local must be ≥32 characters");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toHex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string) {
  return new Uint8Array((hex.match(/.{2}/g) ?? []).map(h => parseInt(h, 16)));
}

export async function seal(value: object): Promise<string> {
  const payload = btoa(JSON.stringify(value));
  const key = await hmacKey();
  const sig = toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
  return `${payload}.${sig}`;
}

export async function unseal<T extends object>(token: string): Promise<T | null> {
  try {
    const dot = token.lastIndexOf(".");
    if (dot === -1) return null;
    const payload = token.slice(0, dot);
    const sigBytes = fromHex(token.slice(dot + 1));
    const key = await hmacKey();
    const ok = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(payload));
    if (!ok) return null;
    const data = JSON.parse(atob(payload)) as { expires: number } & T;
    if (data.expires < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function makeExpiryMs(): number {
  return Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000;
}
