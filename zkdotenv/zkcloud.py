import os
import base64
import requests
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.backends import default_backend

backend = default_backend()

def derive_key(tokenA: str, tokenB: str) -> bytes:
    """Old two-token key derivation (for backward compatibility)"""
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=tokenA.encode(),
        info=b'zkdotenv',
        backend=backend
    )
    return hkdf.derive(tokenB.encode())

def derive_key_from_tokens(tokenA: str, pin: str) -> bytes:
    """New PIN-based key derivation"""
    combined = tokenA + pin
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b'zkshare-pin-salt',  # Fixed salt for PIN-based
        info=b'zkdotenv-pin',
        backend=backend
    )
    return hkdf.derive(combined.encode())

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

def get_pin(prompt="Enter 6-digit PIN: "):
    """Get PIN from user input with validation"""
    while True:
        pin = input(prompt).strip()
        if len(pin) == 6 and pin.isdigit():
            return pin
        print("PIN must be exactly 6 digits. Please try again.")

def decrypt_env_file(zkenv_path, api_base='http://localhost:3001/api', multi=False, pin=None):
    """
    Decrypts all variables in a .zk.env file using the new PIN-based system.
    Returns a dict: {VAR: value, ...}
    Now expects VAR_ENC=<tokenB>:<encrypted> (new format).
    """
    if not pin:
        pin = get_pin("Enter 6-digit PIN for decryption: ")
    
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
            tokenB, encrypted = v.split(':', 1)
        except Exception:
            continue
        
        # 1. Get tokenA from server using tokenB
        resp = requests.post(f'{api_base}/tokens/get', json={'token_b': tokenB})
        if not resp.ok:
            print(f"Warning: Failed to get tokenA for {var}")
            continue
        
        data = resp.json()
        tokenA = data['token_a']
        should_delete = data.get('should_delete', False)
        
        # 2. Derive key using tokenA + PIN and decrypt
        key = derive_key_from_tokens(tokenA, pin)
        try:
            value = decrypt_value(encrypted, key)
            secrets[var] = value
            
            # 3. Delete token only after successful decryption
            if should_delete:
                delete_resp = requests.post(f'{api_base}/tokens/delete', json={'token_b': tokenB})
                if not delete_resp.ok:
                    print(f"Warning: Failed to delete token for {var}")
                    
        except Exception as e:
            print(f"Warning: Failed to decrypt {var}: {e}")
            continue
    
    return secrets

def encrypt_env_file(env_path, zkenv_path, api_base='http://localhost:3001/api', multi=False, pin=None):
    """
    Encrypts all variables in a .env file using the new PIN-based system.
    Writes encrypted values to zkenv_path (.zk.env). Preserves comments and blank lines.
    Now stores as VAR_ENC=<tokenB>:<encrypted> (new format).
    """
    if not pin:
        pin = get_pin("Enter 6-digit PIN for encryption: ")
    
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
        
        # 2. Derive key using tokenA + PIN and encrypt
        key = derive_key_from_tokens(tokenA, pin)
        encrypted = encrypt_value(v, key)
        
        # 3. Output as VAR_ENC=<tokenB>:<encrypted> (new format)
        out_lines.append(f"{k}_ENC={tokenB}:{encrypted}\n")
    
    write_zkenv_lines(zkenv_path, out_lines)
    print(f"Encryption complete! PIN used: {pin}")
    print("IMPORTANT: Share the PIN separately via secure channel!")
    return True 