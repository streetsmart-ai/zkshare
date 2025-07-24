import os
import base64
import argparse
import requests
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.backends import default_backend

API_BASE = os.environ.get('ZKDOTENV_API', 'http://localhost:3001/api')
backend = default_backend()

def derive_key(tokenA: str, tokenB: str) -> bytes:
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=tokenA.encode(),
        info=b'zkdotenv',
        backend=backend
    )
    return hkdf.derive(tokenB.encode())

def encrypt_value(value: str, key: bytes) -> str:
    aesgcm = AESGCM(key)
    iv = os.urandom(12)
    ct = aesgcm.encrypt(iv, value.encode(), None)
    return base64.urlsafe_b64encode(iv + ct).decode()

def decrypt_value(enc: str, key: bytes) -> str:
    data = base64.urlsafe_b64decode(enc.encode())
    iv, ct = data[:12], data[12:]
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(iv, ct, None).decode()

def read_env_lines(path):
    with open(path) as f:
        return f.readlines()

def write_zkenv_lines(path, lines):
    with open(path, 'w') as f:
        f.writelines(lines)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="zkdotenvc: Zero-knowledge .env encryption tool (cloud mode, multi-variable)")
    parser.add_argument('mode', choices=['encrypt', 'decrypt'])
    parser.add_argument('--env', default='.env', help='Path to .env file')
    parser.add_argument('--zkenv', default='.zk.env', help='Path to .zk.env file')
    args = parser.parse_args()

    if args.mode == 'encrypt':
        env_lines = read_env_lines(args.env)
        out_lines = []
        for line in env_lines:
            stripped = line.strip()
            if not stripped or stripped.startswith('#') or '=' not in stripped:
                out_lines.append(line)
                continue
            k, v = stripped.split('=', 1)
            # 1. Request tokens from backend
            resp = requests.post(f'{API_BASE}/tokens', json={})
            if not resp.ok:
                print(f'Failed to get tokens for {k}: {resp.status_code}')
                out_lines.append(f'# ERROR encrypting {k}\n')
                continue
            data = resp.json()
            tokenA = data['token_a']
            tokenB = data['token_b']
            # 2. Derive key and encrypt
            key = derive_key(tokenA, tokenB)
            encrypted = encrypt_value(v, key)
            # 3. Output as VAR_ENC and comment with shareable link
            link = f"{k}#{tokenA}:{encrypted}"
            out_lines.append(f"{k}_ENC={encrypted}\n")
            out_lines.append(f"# zkdotenvc link: {link}\n")
        write_zkenv_lines(args.zkenv, out_lines)
        print(f"Encrypted variables written to {args.zkenv}")
    elif args.mode == 'decrypt':
        zk_lines = read_env_lines(args.zkenv)
        for line in zk_lines:
            stripped = line.strip()
            if not stripped or stripped.startswith('#') or '=' not in stripped:
                continue
            k, v = stripped.split('=', 1)
            if not k.endswith('_ENC'):
                continue
            var = k[:-4]
            # Find the shareable link comment for this variable
            link = None
            for l in zk_lines:
                if l.strip().startswith(f'# zkdotenvc link: {var}#'):
                    link = l.strip().split(': ', 1)[-1]
                    break
            if not link:
                continue
            try:
                _, frag = link.split('#', 1)
                tokenA, encrypted = frag.split(':', 1)
            except Exception:
                continue
            # 1. Request tokenB from backend
            resp = requests.post(f'{API_BASE}/decrypt', json={'token_a': tokenA})
            if not resp.ok:
                continue
            tokenB = resp.json()['token_b']
            # 2. Derive key and decrypt
            key = derive_key(tokenA, tokenB)
            try:
                value = decrypt_value(encrypted, key)
                print(f"{var}={value}")
            except Exception:
                continue
