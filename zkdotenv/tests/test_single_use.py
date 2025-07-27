from zkcloud import decrypt_env_file
import os

print("=== Testing Single-Use Tokens ===")
print("First decryption attempt:")
secrets1 = decrypt_env_file(
    '.zk.env',
    api_base='http://localhost:3001/api',
    multi=False,
    pin='123456'
)
print(f"STRIPE_KEY: {secrets1.get('STRIPE_KEY', 'None')}")

print("\nSecond decryption attempt (should fail):")
secrets2 = decrypt_env_file(
    '.zk.env',
    api_base='http://localhost:3001/api',
    multi=False,
    pin='123456'
)
print(f"STRIPE_KEY: {secrets2.get('STRIPE_KEY', 'None')}")

print("\nThird decryption attempt (should also fail):")
secrets3 = decrypt_env_file(
    '.zk.env',
    api_base='http://localhost:3001/api',
    multi=False,
    pin='123456'
)
print(f"STRIPE_KEY: {secrets3.get('STRIPE_KEY', 'None')}")

print("\n=== Test Complete ===") 