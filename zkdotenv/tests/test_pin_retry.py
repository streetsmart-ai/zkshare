from zkcloud import encrypt_env_file, decrypt_env_file

print("=== Testing PIN Retry Security Fix ===")

print("\n1. Encrypting with PIN: 123456")
encrypt_env_file('.env', '.zk.env', api_base='http://localhost:3001/api', pin='123456')

print("\n2. First attempt with wrong PIN: 111111")
try:
    secrets1 = decrypt_env_file('.zk.env', api_base='http://localhost:3001/api', pin='111111')
    print(f"Result: {secrets1}")
except Exception as e:
    print(f"Error: {e}")

print("\n3. Second attempt with wrong PIN: 222222")
try:
    secrets2 = decrypt_env_file('.zk.env', api_base='http://localhost:3001/api', pin='222222')
    print(f"Result: {secrets2}")
except Exception as e:
    print(f"Error: {e}")

print("\n4. Third attempt with correct PIN: 123456")
try:
    secrets3 = decrypt_env_file('.zk.env', api_base='http://localhost:3001/api', pin='123456')
    print(f"Result: {secrets3}")
    if secrets3.get('STRIPE_KEY') == 'sk_test_123':
        print("✅ SUCCESS: Tokens survived wrong PIN attempts!")
    else:
        print("❌ FAILED: Tokens were destroyed by wrong PIN attempts")
except Exception as e:
    print(f"Error: {e}")

print("\n=== Test Complete ===") 