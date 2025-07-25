from zkcloud import decrypt_env_file
import os

secrets = decrypt_env_file(
    '.zk.env', # source file with encrypted env variables
    api_base='http://localhost:3001/api', # zkshare api base url
    multi=True # decryption allowing mutiple uses of the same key
    )
os.environ.update(secrets)  # Update environment variables
print('STRIPE_KEY: ', os.getenv('STRIPE_KEY'))
print('SUPABASE_KEY: ', os.getenv('SUPABASE_KEY'))


