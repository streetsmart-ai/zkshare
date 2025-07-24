# zkshare

A secure, zero-knowledge secret sharing and environment management toolkit. This project provides a robust backend for ephemeral secret sharing, a Python package for zero-knowledge .env encryption, and a sample React frontend to demonstrate real-world usage.

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

**zkshare** is designed for anyone who needs to share secrets (passwords, API keys, etc.) securely, or manage encrypted environment variables with zero-knowledge guarantees. Secrets are encrypted client-side, never stored in plaintext, and can be accessed only once before being deleted from the server.

- **Backend:** Rust (Axum, Redis) API for token management and ephemeral secret storage.
- **zkdotenv:** Python utilities for encrypting/decrypting .env files using a split-key, zero-knowledge approach.
- **Frontend:** Example React app for creating and accessing secure share links.

---

## Backend (Rust)

The backend is a stateless, ephemeral API written in Rust using [Axum](https://github.com/tokio-rs/axum) and Redis. It provides endpoints for:

- **Token Generation:**
  - `POST /api/tokens` — Issues a pair of cryptographically secure tokens (`token_a`, `token_b`) and stores a hash of `token_a` with `token_b` in Redis, with a configurable TTL.
- **Token Decryption:**
  - `POST /api/decrypt` — Accepts `token_a`, retrieves and deletes the corresponding `token_b` (one-time use), and returns it for decryption.
- **Health Check:**
  - `GET /api/health`

**Security Features:**
- All secrets are encrypted client-side; the server never sees plaintext.
- Tokens are one-time use and expire after a configurable window.
- Rate limiting middleware to prevent abuse (configurable via environment variables).

**Environment Variables:**
- `REDIS_URL` — Redis connection string (default: `redis://localhost:6379`)
- `SERVER_PORT` — Port to run the API (default: `3001`)
- `RATE_LIMIT_MAX` — Max requests per window (default: `10`)
- `RATE_LIMIT_WINDOW` — Window in seconds (default: `3600`)

---

## zkdotenv (Python)

`zkdotenv` is a set of Python scripts for encrypting and decrypting environment variables with zero-knowledge guarantees. It supports both local (password-based) and cloud (split-key, server-assisted) modes.

### Main Scripts

- **zkcloud.py** — Cloud mode, uses the backend for part of the key material. Encrypts `.env` files to `.zk.env` and decrypts them back, never exposing the full secret to the server.
- **others/zkdotenv.py** — Local mode, encrypts/decrypts using a master password (no server required).
- **others/zkdotenvc.py** — Cloud mode, multi-variable support, and shareable links for each variable.

### Usage

**Encrypt:**
```python
from zkcloud import encrypt_env_file
encrypt_env_file('.env', '.zk.env', api_base='http://localhost:3001/api')
```

**Decrypt:**
```python
from zkcloud import decrypt_env_file
secrets = decrypt_env_file('.zk.env', api_base='http://localhost:3001/api')
print(secrets)  # {'STRIPE_KEY': 'sk_test_123', ...}
```

**Command-line (local mode):**
```bash
python others/zkdotenv.py encrypt --env .env --zkenv .zk.env
python others/zkdotenv.py decrypt --zkenv .zk.env
```

**Command-line (cloud mode):**
```bash
python others/zkdotenvc.py encrypt --env .env --zkenv .zk.env
python others/zkdotenvc.py decrypt --zkenv .zk.env
```

---

## Frontend Example (React)

The frontend is a minimal React + TypeScript app (see `frontend/`) that demonstrates how to:
- Create a secure, single-use share link for a secret (password, API key, etc.)
- Access a shared secret via a one-time link
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
5. **Try zkdotenv:**
   ```bash
   cd zkdotenv
   python3 test_zkcloud_encrypt.py
   python3 test_zkcloud_decrypt.py
   ```

---

## Security Model
- Secrets are encrypted in the browser or client, never sent in plaintext to the server.
- The backend only stores a hash of `token_a` and the corresponding `token_b`, and deletes them after use.
- Environment variables can be safely committed in encrypted form (`.zk.env`), with decryption requiring both the encrypted file and access to the backend.

---

## License

MIT. See [LICENSE](LICENSE) for details.
