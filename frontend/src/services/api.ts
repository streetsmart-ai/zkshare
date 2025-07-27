const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export async function createToken(ttlHours?: number) {
  const res = await fetch(`${API_BASE}/api/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ttl_hours: ttlHours }),
  });
  if (!res.ok) throw new Error(`Token creation failed: ${res.status}`);
  return res.json();
}

export async function decryptToken(tokenA: string) {
  const res = await fetch(`${API_BASE}/api/decrypt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token_a: tokenA }),
  });
  if (!res.ok) throw new Error(`Token decryption failed: ${res.status}`);
  return res.json();
}

export async function getToken(tokenB: string) {
  const res = await fetch(`${API_BASE}/api/tokens/get`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token_b: tokenB }),
  });
  if (!res.ok) throw new Error(`Token retrieval failed: ${res.status}`);
  return res.json();
} 