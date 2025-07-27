from zkcloud import encrypt_env_file, decrypt_env_file

print("=== Testing No PIN Scenario ===")

print("\n1. Testing encryption without PIN (should prompt):")
try:
    encrypt_env_file('.env', '.zk.env', api_base='http://localhost:3001/api', pin=None)
except KeyboardInterrupt:
    print("User interrupted PIN input")

print("\n2. Testing decryption without PIN (should prompt):")
try:
    secrets = decrypt_env_file('.zk.env', api_base='http://localhost:3001/api', pin=None)
    print(f"Decrypted secrets: {secrets}")
except KeyboardInterrupt:
    print("User interrupted PIN input")

print("\n=== Test Complete ===") 