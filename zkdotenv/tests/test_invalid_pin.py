from zkcloud import decrypt_env_file

print("=== Testing Invalid PIN Scenarios ===")

print("\n1. Testing with wrong PIN (should fail decryption):")
try:
    secrets = decrypt_env_file('.zk.env', api_base='http://localhost:3001/api', pin='999999')
    print(f"Decrypted secrets: {secrets}")
except Exception as e:
    print(f"Error: {e}")

print("\n2. Testing with empty PIN (should prompt for valid PIN):")
try:
    secrets = decrypt_env_file('.zk.env', api_base='http://localhost:3001/api', pin='')
    print(f"Decrypted secrets: {secrets}")
except KeyboardInterrupt:
    print("User interrupted PIN input")

print("\n3. Testing with short PIN (should prompt for valid PIN):")
try:
    secrets = decrypt_env_file('.zk.env', api_base='http://localhost:3001/api', pin='123')
    print(f"Decrypted secrets: {secrets}")
except KeyboardInterrupt:
    print("User interrupted PIN input")

print("\n=== Test Complete ===") 