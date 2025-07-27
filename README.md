# zkshare

A secure, PIN-protected secret sharing and environment management toolkit with client-side encryption. This project provides a robust backend for ephemeral secret sharing, a Python package for encrypted .env management, and a sample React frontend to demonstrate real-world usage.

---

## Table of Contents
- [Overview](#overview)
- [Backend (Rust)](#backend-rust)
- [zkdotenv (Python)](#zkdotenv-python)
- [Frontend Example (React)](#frontend-example-react)
- [Getting Started](#getting-started)
- [Security Model](#security-model)
- [License](#license)

---

## Overview

**zkshare** is designed for anyone who needs to share secrets (passwords, API keys, etc.) securely, or manage encrypted environment variables with triple-layer security. Secrets are encrypted client-side with PIN protection, never stored in plaintext, and can be configured for single-use or multi-use access.

- **Backend:** Rust (Axum, Redis) API for token management and ephemeral secret storage.
- **zkdotenv:** Python utilities for encrypting/decrypting .env files using PIN-based encryption.
- **Frontend:** Example React app for creating and accessing secure share links with PIN protection.

---

## Backend (Rust)

The backend is a stateless, ephemeral API written in Rust using [Axum](https://github.com/tokio-rs/axum) and Redis. It provides endpoints for:

- **Token Generation:**
  - `POST /api/tokens` — Issues a pair of cryptographically secure tokens (`token_a`, `token_b`) and stores `token_a` with `token_b` in Redis, with a configurable TTL and multi-use flag.
- **Token Retrieval:**
  - `POST /api/tokens/get` — Accepts `token_b`, retrieves and optionally deletes the corresponding `token_a` (based on multi-use flag), and returns it for decryption.
- **Legacy Token Decryption:**
  - `POST /api/decrypt` — Legacy endpoint for the old two-token system (maintained for backward compatibility).
- **Health Check:**
  - `GET /api/health`

**Security Features:**
- All secrets are encrypted client-side; the server never sees plaintext.
- PIN-based encryption adds an extra layer of security.
- Tokens can be configured for single-use (deleted after access) or multi-use.
- Rate limiting middleware to prevent abuse (configurable via environment variables).

**Environment Variables:**
- `REDIS_URL` — Redis connection string (default: `redis://localhost:6379`)
- `SERVER_PORT` — Port to run the API (default: `3001`)
- `RATE_LIMIT_MAX` — Max requests per window (default: `10`)
- `RATE_LIMIT_WINDOW` — Window in seconds (default: `3600`)

---

## zkdotenv (Python)

`zkdotenv` is a set of Python scripts for encrypting and decrypting environment variables with PIN-based client-side encryption. It supports both local (password-based) and cloud (PIN-based, server-assisted) modes.

### Main Scripts

- **zkcloud.py** — Cloud mode, uses the backend for token management and PIN-based encryption. Encrypts `.env` files to `.zk.env` and decrypts them back, keeping secrets encrypted from the server.
- **tests/zkdotenv.py** — Local mode, encrypts/decrypts using a master password (no server required).
- **tests/zkdotenvc.py** — Cloud mode, multi-variable support, and shareable links for each variable.

### Usage

**Encrypt with PIN:**
```python
from zkcloud import encrypt_env_file
encrypt_env_file('.env', '.zk.env', api_base='http://localhost:3001/api', pin='123456')
# You'll be prompted for a 6-digit PIN if not provided
```

**Decrypt with PIN:**
```python
from zkcloud import decrypt_env_file
secrets = decrypt_env_file('.zk.env', api_base='http://localhost:3001/api', pin='123456')
print(secrets)  # {'STRIPE_KEY': 'sk_test_123', ...}
```

**Command-line (local mode):**
```bash
python tests/zkdotenv.py encrypt --env .env --zkenv .zk.env
python tests/zkdotenv.py decrypt --zkenv .zk.env
```

**Command-line (cloud mode):**
```bash
python tests/zkdotenvc.py encrypt --env .env --zkenv .zk.env
python tests/zkdotenvc.py decrypt --zkenv .zk.env
```

### PIN Security

The 6-digit PIN is:
- **Never stored** on the server
- **Never transmitted** in plaintext
- Used to derive the final encryption key along with `token_a`
- Required for both encryption and decryption

---

## Frontend Example (React)

The frontend is a minimal React + TypeScript app (see `frontend/`) that demonstrates how to:
- Create a secure, PIN-protected share link for a secret (password, API key, etc.)
- Access a shared secret via a one-time link with PIN verification
- All encryption and decryption happens in the browser; the backend only stores tokens

This frontend is meant as a reference implementation. You can adapt the flows for your own apps, bots, or CLI tools.

---

## Getting Started

1. **Clone the repo:**
   ```bash
   git clone https://github.com/streetsmart-ai/zkshare.git
   cd zkshare
   ```
2. **Start Redis:**
   ```bash
   docker run --rm -p 6379:6379 redis
   ```
3. **Run the backend:**
   ```bash
   cd backend
   cargo run
   ```
4. **Try the frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
5. **Try zkdotenv with PIN:**
   ```bash
   cd zkdotenv
   python3 test_zkcloud_encrypt.py  # Uses PIN: 123456
   python3 test_zkcloud_decrypt.py  # Uses PIN: 123456
   ```

---

## Security Model

### Triple-Layer Protection

1. **PIN Protection:** 6-digit PIN adds an extra layer of security. Even with encrypted data and server access, secrets remain protected without the PIN.

2. **Client-Side Encryption:** All encryption happens in your browser or client. We never see your secrets, only encrypted blobs and tokens.

3. **Ephemeral Tokens:** Single-use tokens that self-destruct after access. Configurable TTL ensures secrets don't linger longer than needed.

### Encryption Flow

1. User enters secret + 6-digit PIN
2. Client generates `token_a` + `token_b`
3. Client derives key from: `token_a` + PIN
4. Client encrypts secret with derived key
5. Server stores: `token_a` (not hashed)
6. Client stores: `token_b` + encrypted data

### Decryption Flow

1. User enters 6-digit PIN
2. Client sends `token_b` to server
3. Server returns `token_a`
4. Client derives key from: `token_a` + PIN
5. Client decrypts secret
6. Server deletes token (single-use)

### Security Guarantees

- **Server Compromise:** Even if the server is compromised, secrets remain protected without the PIN
- **Man-in-the-Middle:** Encrypted data and tokens are useless without the PIN
- **Ephemeral Storage:** Tokens are deleted after use (single-use mode)
- **Rate Limiting:** Prevents brute force attacks on the API

---

## License

MIT. See [LICENSE](LICENSE) for details.