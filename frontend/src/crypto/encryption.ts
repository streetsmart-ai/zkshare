import { deriveKey } from './keyDerivation';

function bufToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function base64ToBuf(b64: string): ArrayBuffer {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
}

export async function encryptPassword(password: string, tokenA: string, tokenB: string): Promise<string> {
  const key = await deriveKey(tokenA, tokenB);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  // Format: base64(iv).base64(ciphertext)
  return bufToBase64(iv) + '.' + bufToBase64(encrypted);
}

export async function decryptPassword(encryptedData: string, tokenA: string, tokenB: string): Promise<string> {
  const key = await deriveKey(tokenA, tokenB);
  const [ivB64, ctB64] = encryptedData.split('.');
  if (!ivB64 || !ctB64) throw new Error('Malformed encrypted data');
  const iv = new Uint8Array(base64ToBuf(ivB64));
  const ct = base64ToBuf(ctB64);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ct
  );
  return new TextDecoder().decode(decrypted);
}

// New PIN-based encryption functions
export async function deriveKeyFromTokens(tokenA: string, pin: string): Promise<CryptoKey> {
  // Combine token_a + PIN for final encryption key
  const combined = tokenA + pin;
  
  const encoder = new TextEncoder();
  const salt = encoder.encode('zkshare-pin-salt'); // Fixed salt for PIN-based derivation
  const ikm = encoder.encode(combined);
  
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

export async function encryptData(data: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(data);
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );
  
  // Format: base64(iv).base64(ciphertext) - same as old functions
  return bufToBase64(iv) + '.' + bufToBase64(encrypted);
}

export async function decryptData(encryptedData: string, key: CryptoKey): Promise<string> {
  const [ivB64, ctB64] = encryptedData.split('.');
  if (!ivB64 || !ctB64) throw new Error('Malformed encrypted data');
  
  const iv = new Uint8Array(base64ToBuf(ivB64));
  const ct = base64ToBuf(ctB64);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ct
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
} 