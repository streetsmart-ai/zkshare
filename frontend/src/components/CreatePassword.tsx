import React, { useState } from 'react';
import { createToken } from '../services/api';
import { encryptPassword } from '../crypto/encryption';

const MAX_LENGTH = Number(import.meta.env.VITE_MAX_PASSWORD_LENGTH) || 1000;

const CreatePassword: React.FC = () => {
  const [secret, setSecret] = useState('');
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSecret, setShowSecret] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setLink('');
    setCopied(false);
    try {
      const { token_a, token_b } = await createToken();
      const encrypted = await encryptPassword(secret, token_a, token_b);
      const url = `${window.location.origin}/access#${token_a}:${encrypted}`;
      setLink(url);
    } catch (err: any) {
      setError(err.message || 'Failed to generate link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (link) {
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f8fafc 60%, #e0e7ef 100%)' }}>
      <div style={{ maxWidth: 480, width: '100%', padding: 32, borderRadius: 16, background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <h2 style={{ fontWeight: 700, fontSize: 28, marginBottom: 16, textAlign: 'center', letterSpacing: 1 }}>Create a Secure Share Link</h2>
        <form onSubmit={handleSubmit}>
          <label style={{ fontWeight: 500, marginBottom: 8, display: 'block' }}>
            Secret to Share
          </label>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <textarea
              value={showSecret ? secret : '*'.repeat(secret.length)}
              onChange={e => setSecret(e.target.value.slice(0, MAX_LENGTH))}
              placeholder="Paste or type your secret (max 1000 characters)"
              rows={5}
              style={{ flex: 1, minWidth: 0, padding: '12px', fontSize: 16, borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#222', resize: 'vertical', letterSpacing: 0.2, transition: 'background 0.2s' }}
              maxLength={MAX_LENGTH}
              spellCheck={false}
              autoFocus
              readOnly={loading}
              aria-label="Secret to Share"
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
            This can be any sensitive text (password, API key, note, etc). It will be encrypted in your browser. Max {MAX_LENGTH} characters.
          </div>
          <button
            type="submit"
            style={{ width: '100%', padding: 14, fontSize: 17, fontWeight: 600, borderRadius: 8, background: 'linear-gradient(90deg, #6366f1 60%, #0ea5e9 100%)', color: '#fff', border: 'none', boxShadow: '0 2px 8px rgba(99,102,241,0.08)', cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 8, transition: 'background 0.2s' }}
            disabled={loading || !secret.trim()}
          >
            {loading ? 'Generating...' : 'Generate Link'}
          </button>
        </form>
        {link && (
          <div style={{ marginTop: 24, padding: 18, background: '#f1f5f9', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontWeight: 500, marginBottom: 8 }}>Share this link:</div>
            <div style={{ wordBreak: 'break-all', fontSize: 15, marginBottom: 10, color: '#334155' }}>{link}</div>
            <button
              onClick={handleCopy}
              style={{ padding: '8px 18px', borderRadius: 6, background: copied ? '#22c55e' : '#6366f1', color: '#fff', border: 'none', fontWeight: 500, fontSize: 15, cursor: 'pointer', transition: 'background 0.2s' }}
            >
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>
        )}
        {error && <div style={{ color: 'red', marginTop: 16, textAlign: 'center' }}>{error}</div>}
      </div>
    </div>
  );
};

export default CreatePassword; 