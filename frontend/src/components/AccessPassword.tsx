import React, { useState, useEffect } from 'react';
import { getToken } from '../services/api';
import { deriveKeyFromTokens, decryptData } from '../crypto/encryption';

const AccessPassword: React.FC = () => {
  const [token, setToken] = useState('');
  const [encryptedData, setEncryptedData] = useState('');
  const [pin, setPin] = useState('');
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [showSecret, setShowSecret] = useState(true);
  const [showPin, setShowPin] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    // Parse URL parameters for token and encrypted data
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    const dataParam = urlParams.get('data');
    
    if (tokenParam) setToken(tokenParam);
    if (dataParam) setEncryptedData(decodeURIComponent(dataParam));
  }, []);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits and limit to 6 characters
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(value);
  };

  const handleReveal = async () => {
    setLoading(true);
    setError('');
    setSecret('');
    setExpired(false);
    try {
      if (!token || !encryptedData || pin.length !== 6) {
        throw new Error('Please provide token, encrypted data, and 6-digit PIN.');
      }

      console.log('Starting decryption with:', { token, pin, encryptedDataLength: encryptedData.length });

      // 1. Get token_a from server using token_b
      console.log('Getting token_a from server...');
      const { token_a } = await getToken(token);
      console.log('Received token_a:', token_a);
      
      // 2. Combine token_a with PIN for final decryption key
      console.log('Deriving key from token_a + PIN...');
      const finalKey = await deriveKeyFromTokens(token_a, pin);
      console.log('Key derived successfully');
      
      // 3. Decrypt data
      console.log('Decrypting data...');
      const decrypted = await decryptData(encryptedData, finalKey);
      console.log('Decryption successful:', decrypted);
      setSecret(decrypted);
      setRevealed(true);
      
      // Auto-hide after 60 seconds for security
      setTimeout(() => setSecret(''), 60000);
    } catch (err: any) {
      console.error('Decryption failed:', err);
      if (err.message && err.message.includes('404')) {
        setExpired(true);
        setError('This link has expired or has already been used.');
      } else {
        setError(err.message || 'Failed to decrypt. Check your PIN and try again.');
      }
    } finally {
      setLoading(false);
    }
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
            zkshare@terminal:~$ access_secure_share
          </span>
        </div>

        <h2 style={{
          fontSize: '24px',
          fontWeight: '500',
          marginBottom: '24px',
          color: 'var(--text)',
          textAlign: 'center'
        }}>
          <span className="glow">access shared secret</span>
        </h2>

        {!revealed && !expired && (
          <div className="fade-in">
            <div style={{
              fontSize: '14px',
              color: 'var(--text-dim)',
              marginBottom: '24px',
              textAlign: 'center',
              fontFamily: 'JetBrains Mono, monospace',
              lineHeight: '1.5'
            }}>
              enter the share token and security pin to decrypt.<br />
              this link will expire after use and the secret will be deleted.
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: 'var(--text)',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                share token:
              </label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="enter share token..."
                style={{
                  width: '100%',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  padding: '16px',
                  fontSize: '14px',
                  borderRadius: '4px',
                  fontFamily: 'JetBrains Mono, monospace'
                }}
                readOnly={loading}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: 'var(--text)',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                security pin:
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
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
            </div>
            
            <button
              onClick={handleReveal}
              disabled={loading || !token || pin.length !== 6}
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
              {loading ? 'decrypting...' : 'decrypt secret'}
            </button>
          </div>
        )}

        {revealed && secret && (
          <div className="fade-in" style={{ marginTop: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '12px',
              color: 'var(--accent)',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              decrypted secret:
            </label>
            
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              marginBottom: '16px',
              gap: '8px'
            }}>
              <textarea
                value={showSecret ? secret : '*'.repeat(secret.length)}
                readOnly
                rows={6}
                style={{
                  flex: 1,
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  padding: '16px',
                  fontSize: '14px',
                  borderRadius: '4px',
                  fontFamily: 'JetBrains Mono, monospace',
                  minHeight: '120px'
                }}
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
            
            <div style={{
              fontSize: '12px',
              color: 'var(--text-dim)',
              marginBottom: '16px',
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              decrypted in your browser • auto-hide in 60s • pin never sent to server
            </div>
          </div>
        )}

        {expired && (
          <div className="fade-in" style={{
            color: 'var(--error)',
            marginTop: '32px',
            textAlign: 'center',
            fontWeight: '500',
            fontSize: '16px',
            padding: '20px',
            background: 'rgba(255, 68, 68, 0.1)',
            border: '1px solid var(--error)',
            borderRadius: '4px'
          }}>
            this link has expired or has already been used.<br />
            the secret is no longer available.
          </div>
        )}

        {error && !expired && (
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

        <div style={{
          fontSize: '12px',
          color: 'var(--text-dim)',
          marginTop: '32px',
          textAlign: 'center',
          fontFamily: 'JetBrains Mono, monospace'
        }}>
          <a href="/" style={{ color: 'var(--accent)' }}>create new secret</a>
        </div>
      </div>
    </div>
  );
};

export default AccessPassword; 