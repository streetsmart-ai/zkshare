export async function deriveKey(tokenA: string, tokenB: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const salt = encoder.encode(tokenA);
  const ikm = encoder.encode(tokenB);
  // Import as raw key
  const baseKey = await crypto.subtle.importKey(
    'raw',
    ikm,
    'HKDF',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: new Uint8Array([]),
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
} 