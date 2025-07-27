from zkcloud import encrypt_env_file

# Test with PIN-based encryption
encrypt_env_file(
    '.env', # source file with env variables to encrypt
    '.zk.env', # destination file with encrypted env variables
    api_base='http://localhost:3001/api', # zkshare api base url
    multi=False, # encryption allowing multiple uses of the same key
    pin='' # 6-digit PIN for encryption (in production, don't hardcode!)
)
