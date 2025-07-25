import os
import base64
import requests
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.backends import default_backend

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

def decrypt_env_file(zkenv_path, api_base='http://localhost:3001/api', multi=False):
    """
    Decrypts all variables in a .zk.env file using the backend for tokenB.
    Returns a dict: {VAR: value, ...}
    Now expects VAR_ENC=<tokenA>:<encrypted> (no comment).
    """
    zk_lines = read_env_lines(zkenv_path)
    secrets = {}
    for line in zk_lines:
        stripped = line.strip()
        if not stripped or stripped.startswith('#') or '=' not in stripped:
            continue
        k, v = stripped.split('=', 1)
        if not k.endswith('_ENC'):
            continue
        var = k[:-4]
        try:
            tokenA, encrypted = v.split(':', 1)
        except Exception:
            continue
        # 1. Request tokenB from backend
        resp = requests.post(f'{api_base}/decrypt', json={'token_a': tokenA})
        if not resp.ok:
            continue
        tokenB = resp.json()['token_b']
        # 2. Derive key and decrypt
        key = derive_key(tokenA, tokenB)
        try:
            value = decrypt_value(encrypted, key)
            secrets[var] = value
        except Exception:
            continue
    return secrets

def encrypt_env_file(env_path, zkenv_path, api_base='http://localhost:3001/api', multi=False):
    """
    Encrypts all variables in a .env file using the backend for tokenA/tokenB.
    Writes encrypted values to zkenv_path (.zk.env). Preserves comments and blank lines.
    Now stores as VAR_ENC=<tokenA>:<encrypted> (no comment).
    """
    def read_env_lines(path):
        with open(path) as f:
            return f.readlines()
    def write_zkenv_lines(path, lines):
        with open(path, 'w') as f:
            f.writelines(lines)
    env_lines = read_env_lines(env_path)
    out_lines = []
    for line in env_lines:
        stripped = line.strip()
        if not stripped or stripped.startswith('#') or '=' not in stripped:
            out_lines.append(line)
            continue
        k, v = stripped.split('=', 1)
        # 1. Request tokens from backend
        payload = {'multi': multi} if multi else {}
        resp = requests.post(f'{api_base}/tokens', json=payload)
        if not resp.ok:
            out_lines.append(f'# ERROR encrypting {k}\n')
            continue
        data = resp.json()
        tokenA = data['token_a']
        tokenB = data['token_b']
        # 2. Derive key and encrypt
        key = derive_key(tokenA, tokenB)
        encrypted = encrypt_value(v, key)
        # 3. Output as VAR_ENC=<tokenA>:<encrypted>
        out_lines.append(f"{k}_ENC={tokenA}:{encrypted}\n")
    write_zkenv_lines(zkenv_path, out_lines)
    return True 