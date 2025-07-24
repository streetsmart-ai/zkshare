import os
import base64
import getpass
import argparse
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.backends import default_backend

backend = default_backend()

# Helper: derive a key from master password and variable name
def derive_key(master_password: str, var_name: str) -> bytes:
    salt = var_name.encode()
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100_000,
        backend=backend
    )
    return kdf.derive(master_password.encode())

# Helper: encrypt a value
def encrypt_value(value: str, key: bytes) -> str:
    aesgcm = AESGCM(key)
    iv = os.urandom(12)
    ct = aesgcm.encrypt(iv, value.encode(), None)
    return base64.urlsafe_b64encode(iv + ct).decode()

# Helper: decrypt a value
def decrypt_value(enc: str, key: bytes) -> str:
    data = base64.urlsafe_b64decode(enc.encode())
    iv, ct = data[:12], data[12:]
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(iv, ct, None).decode()

# Read .env file
def read_env_file(path):
    env = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip()
    return env

# Write .zk.env file
def write_zkenv_file(path, enc_vars):
    with open(path, 'w') as f:
        for k, v in enc_vars.items():
            f.write(f"{k}_ENC={v}\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="zkdotenv: Zero-knowledge .env encryption tool")
    parser.add_argument('mode', choices=['encrypt', 'decrypt'])
    parser.add_argument('--env', default='.env', help='Path to .env file')
    parser.add_argument('--zkenv', default='.zk.env', help='Path to .zk.env file')
    args = parser.parse_args()

    if args.mode == 'encrypt':
        env = read_env_file(args.env)
        master_password = getpass.getpass('Master password: ')
        enc_vars = {}
        for k, v in env.items():
            key = derive_key(master_password, k)
            enc_vars[k] = encrypt_value(v, key)
        write_zkenv_file(args.zkenv, enc_vars)
        print(f"Encrypted variables written to {args.zkenv}")
    elif args.mode == 'decrypt':
        env = read_env_file(args.zkenv)
        master_password = getpass.getpass('Master password: ')
        for k, v in env.items():
            if not k.endswith('_ENC'):
                continue
            var_name = k[:-4]
            key = derive_key(master_password, var_name)
            try:
                dec = decrypt_value(v, key)
                print(f"{var_name}={dec}")
            except Exception as e:
                print(f"Failed to decrypt {var_name}: {e}")
