import React, { useState, useEffect } from 'react';
import { decryptToken } from '../services/api';
import { decryptPassword } from '../crypto/encryption';

const AccessPassword: React.FC = () => {
  const [fragment, setFragment] = useState('');
  const [tokenA, setTokenA] = useState('');
  const [encrypted, setEncrypted] = useState('');
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [showSecret, setShowSecret] = useState(true);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    // On mount, parse the fragment
    const hash = window.location.hash.slice(1);
    setFragment(hash);
    const [a, b] = hash.split(':');
    setTokenA(a || '');
    setEncrypted(b || '');
  }, []);

  const handleReveal = async () => {
    setLoading(true);
    setError('');
    setSecret('');
    setExpired(false);
    try {
      if (!tokenA || !encrypted) throw new Error('Malformed or missing link fragment.');
      const { token_b } = await decryptToken(tokenA);
      const decrypted = await decryptPassword(encrypted, tokenA, token_b);
      setSecret(decrypted);
      setRevealed(true);
      // Optionally, auto-hide after a timeout for extra security
      setTimeout(() => setSecret(''), 60000); // Hide after 60s
    } catch (err: any) {
      if (err.message && err.message.includes('404')) {
        setExpired(true);
        setError('This link has expired or has already been used.');
      } else {
        setError(err.message || 'Failed to reveal secret');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f8fafc 60%, #e0e7ef 100%)' }}>
      <div style={{ maxWidth: 480, width: '100%', padding: 32, borderRadius: 16, background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <h2 style={{ fontWeight: 700, fontSize: 28, marginBottom: 16, textAlign: 'center', letterSpacing: 1 }}>Access Shared Secret</h2>
        {!revealed && !expired && (
          <>
            <div style={{ fontSize: 15, color: '#64748b', marginBottom: 18, textAlign: 'center' }}>
              Click the button below to reveal the secret. This link will expire after use and the secret will be deleted from the server.
            </div>
            <button
              onClick={handleReveal}
              style={{ width: '100%', padding: 14, fontSize: 17, fontWeight: 600, borderRadius: 8, background: 'linear-gradient(90deg, #6366f1 60%, #0ea5e9 100%)', color: '#fff', border: 'none', boxShadow: '0 2px 8px rgba(99,102,241,0.08)', cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 8, transition: 'background 0.2s' }}
              disabled={loading || !tokenA || !encrypted}
            >
              {loading ? 'Revealing...' : 'Reveal Content'}
            </button>
          </>
        )}
        {revealed && secret && (
          <div style={{ marginTop: 24 }}>
            <label style={{ fontWeight: 500, marginBottom: 8, display: 'block' }}>Revealed Secret</label>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <textarea
                value={showSecret ? secret : '*'.repeat(secret.length)}
                readOnly
                rows={5}
                style={{ flex: 1, minWidth: 0, padding: '12px', fontSize: 16, borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#222', resize: 'vertical', letterSpacing: 0.2, transition: 'background 0.2s' }}
                aria-label="Revealed Secret"
              />
              <button
                type="button"
                onClick={() => setShowSecret(s => !s)}
                style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#64748b', display: 'flex', alignItems: 'center', height: 32 }}
                aria-label={showSecret ? 'Hide secret' : 'Show secret'}
              >
                {showSecret ? '🙈' : '👁️'}
              </button>
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              This secret is decrypted in your browser and never sent to the server. It will be hidden again after 60 seconds for your security.
            </div>
          </div>
        )}
        {expired && (
          <div style={{ color: '#ef4444', marginTop: 32, textAlign: 'center', fontWeight: 500, fontSize: 17 }}>
            This link has expired or has already been used.<br />
            The secret is no longer available.
          </div>
        )}
        {error && <div style={{ color: 'red', marginTop: 16, textAlign: 'center' }}>{error}</div>}
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 32, textAlign: 'center' }}>
          <strong>How does this work?</strong><br />
          The secret is never stored on the server. The link can only be used once. After you reveal the content, it is deleted from the server and cannot be accessed again.
        </div>
      </div>
    </div>
  );
};

export default AccessPassword; 