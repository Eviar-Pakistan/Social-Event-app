import os
import json
import base64
from Crypto.Cipher import AES

SECRET_KEY = "paragon034529346" 

data = {
    "id":1,
    "gameName": "Rings",
    "gameScore": 100,
    "type":"completed"
}

json_bytes = json.dumps(data).encode("utf-8")

cipher = AES.new(SECRET_KEY.encode("utf-8"), AES.MODE_EAX)
ciphertext, tag = cipher.encrypt_and_digest(json_bytes)

payload = {
    "nonce": base64.b64encode(cipher.nonce).decode(),
    "cipher": base64.b64encode(ciphertext).decode(),
    "tag": base64.b64encode(tag).decode()
}

encrypted_qr = base64.b64encode(json.dumps(payload).encode()).decode()

print("Encrypted QR Text:\n", encrypted_qr)
