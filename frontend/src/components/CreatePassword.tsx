import React, { useState } from 'react';
import { createToken } from '../services/api';
import { deriveKeyFromTokens, encryptData } from '../crypto/encryption';

const MAX_LENGTH = Number(import.meta.env.VITE_MAX_PASSWORD_LENGTH) || 1000;

const CreatePassword: React.FC = () => {
  const [secret, setSecret] = useState('');
  const [pin, setPin] = useState('');
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSecret, setShowSecret] = useState(true);
  const [showPin, setShowPin] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setLink('');
    setCopied(false);
    try {
      // 1. Get token pair from server
      const { token_a, token_b } = await createToken();
      
      // 2. Combine token_a with PIN for final encryption key
      const finalKey = await deriveKeyFromTokens(token_a, pin);
      
      // 3. Encrypt secret with final key
      const encryptedData = await encryptData(secret, finalKey);

      // 4. Create share link (PIN never included!)
      const url = `${window.location.origin}/access?token=${token_b}&data=${encodeURIComponent(encryptedData)}`;
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

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits and limit to 6 characters
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(value);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '600px',
        width: '100%',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '32px',
        position: 'relative'
      }}>
        {/* Terminal header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border)'
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: 'var(--accent)',
            marginRight: '12px',
            boxShadow: '0 0 8px var(--accent)'
          }} />
          <span style={{
            color: 'var(--accent)',
            fontSize: '14px',
            fontWeight: '500',
            fontFamily: 'JetBrains Mono, monospace'
          }}>
            zkshare@terminal:~$ create_secure_share
          </span>
        </div>

        <h2 style={{
          fontSize: '24px',
          fontWeight: '500',
          marginBottom: '24px',
          color: 'var(--text)',
          textAlign: 'center'
        }}>
          <span className="glow">share secrets.</span>
          <br />
          <span style={{ color: 'var(--accent)' }}>leave no trace.</span>
        </h2>

        <form onSubmit={handleSubmit}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            color: 'var(--text)',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            secret to encrypt:
          </label>
          
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            marginBottom: '16px',
            gap: '8px'
          }}>
            <textarea
              value={showSecret ? secret : '*'.repeat(secret.length)}
              onChange={e => setSecret(e.target.value.slice(0, MAX_LENGTH))}
              placeholder="paste your secret here (api keys, passwords, etc.)"
              rows={6}
              style={{
                flex: 1,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                padding: '16px',
                fontSize: '14px',
                borderRadius: '4px',
                resize: 'vertical',
                fontFamily: 'JetBrains Mono, monospace',
                minHeight: '120px'
              }}
              maxLength={MAX_LENGTH}
              spellCheck={false}
              autoFocus
              readOnly={loading}
            />
            <button
              type="button"
              onClick={() => setShowSecret(s => !s)}
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                color: 'var(--text-dim)',
                padding: '8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                minWidth: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {showSecret ? '🙈' : '👁️'}
            </button>
          </div>

          <label style={{
            display: 'block',
            marginBottom: '8px',
            color: 'var(--text)',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            security pin (6 digits):
          </label>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '16px',
            gap: '8px'
          }}>
            <input
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={handlePinChange}
              placeholder="enter 6-digit pin..."
              style={{
                flex: 1,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                padding: '16px',
                fontSize: '14px',
                borderRadius: '4px',
                fontFamily: 'JetBrains Mono, monospace'
              }}
              pattern="[0-9]{6}"
              maxLength={6}
              readOnly={loading}
            />
            <button
              type="button"
              onClick={() => setShowPin(s => !s)}
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                color: 'var(--text-dim)',
                padding: '8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                minWidth: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {showPin ? '🙈' : '👁️'}
            </button>
          </div>

          <div style={{
            fontSize: '12px',
            color: 'var(--text-dim)',
            marginBottom: '24px',
            fontFamily: 'JetBrains Mono, monospace'
          }}>
            max {MAX_LENGTH} chars • encrypted client-side • pin never stored • one-time use
          </div>

          <button
            type="submit"
            disabled={loading || !secret.trim() || pin.length !== 6}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              fontWeight: '500',
              background: 'var(--surface)',
              border: '1px solid var(--accent)',
              color: 'var(--accent)',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'JetBrains Mono, monospace',
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? 'generating secure link...' : 'generate secure link'}
          </button>
        </form>

        {link && (
          <div className="fade-in" style={{
            marginTop: '24px',
            padding: '20px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '4px'
          }}>
            <div style={{
              fontSize: '14px',
              color: 'var(--accent)',
              marginBottom: '12px',
              fontWeight: '500'
            }}>
              secure link generated:
            </div>
            <div style={{
              wordBreak: 'break-all',
              fontSize: '13px',
              color: 'var(--text-dim)',
              marginBottom: '16px',
              padding: '12px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              {link}
            </div>
            <button
              onClick={handleCopy}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                background: copied ? 'var(--success)' : 'var(--surface)',
                border: `1px solid ${copied ? 'var(--success)' : 'var(--accent)'}`,
                color: copied ? 'var(--bg)' : 'var(--accent)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: 'JetBrains Mono, monospace'
              }}
            >
              {copied ? 'copied!' : 'copy link'}
            </button>
            
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: 'rgba(255, 193, 7, 0.1)',
              border: '1px solid #ffc107',
              borderRadius: '4px',
              fontSize: '13px',
              color: '#ffc107'
            }}>
              ⚠️ <strong>IMPORTANT:</strong> Share the PIN separately via secure channel!
            </div>
            
            <div style={{
              marginTop: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <label style={{
                fontSize: '13px',
                color: 'var(--text-dim)',
                fontWeight: '500'
              }}>
                PIN to share:
              </label>
              <input
                type="text"
                value={pin}
                readOnly
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  padding: '8px 12px',
                  fontSize: '13px',
                  borderRadius: '4px',
                  fontFamily: 'JetBrains Mono, monospace',
                  width: '80px',
                  textAlign: 'center'
                }}
                onClick={(e) => e.currentTarget.select()}
              />
              <button
                onClick={() => navigator.clipboard.writeText(pin)}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  background: 'var(--surface)',
                  border: '1px solid var(--accent)',
                  color: 'var(--accent)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: 'JetBrains Mono, monospace'
                }}
              >
                copy pin
              </button>
            </div>
          </div>
        )}

        {error && (
          <div style={{
            color: 'var(--error)',
            marginTop: '16px',
            textAlign: 'center',
            fontSize: '14px',
            padding: '12px',
            background: 'rgba(255, 68, 68, 0.1)',
            border: '1px solid var(--error)',
            borderRadius: '4px'
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatePassword; 