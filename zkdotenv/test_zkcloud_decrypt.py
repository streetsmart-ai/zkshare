from zkcloud import decrypt_env_file
import os

secrets = decrypt_env_file('.zk.env', api_base='http://localhost:3001/api')
print(secrets)  # {'STRIPE_KEY': 'sk_test_123', 'SUPABASE_KEY': 'sb_test_456'}
os.environ.update(secrets)  # Update environment variables
print(os.getenv('STRIPE_KEY'))
print(os.getenv('SUPABASE_KEY'))
