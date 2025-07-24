from zkcloud import encrypt_env_file

encrypt_env_file('.env', '.zk.env', api_base='http://localhost:3001/api')