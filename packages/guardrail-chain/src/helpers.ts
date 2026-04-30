/**
 * General utility functions.
 */

/**
 * Generate a v4 UUID for correlation IDs.
 *
 * Uses `globalThis.crypto.randomUUID()` when available (Node 18+, modern
 * browsers); falls back to a `Math.random`-based implementation for older
 * or exotic runtimes. The fallback is NOT cryptographically strong — do
 * not use the returned string as a secret.
 */
export function generateCorrelationId(): string {
  const webCrypto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (webCrypto?.randomUUID) {
    return webCrypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** 53‑bit string hash using MurmurHash-inspired mixing. */
export function hashString(input: string): number {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 & 0x1fffff) * 0x1000000000 + (h2 >>> 0);
}
