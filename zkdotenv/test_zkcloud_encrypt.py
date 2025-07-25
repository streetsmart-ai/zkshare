from zkcloud import encrypt_env_file

encrypt_env_file(
    '.env', # source file with env variables to encrypt
    '.zk.env', # destination file with encrypted env variables
    api_base='http://localhost:3001/api', # zkshare api base url
    multi=True # encryption allowing mutiple uses of the same key
    )
