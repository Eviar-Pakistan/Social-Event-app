import base64
import json
from Crypto.Cipher import AES
from django.conf import settings


def decrypt_qr(encrypted_text: str) -> dict:

    try:
        decoded_payload = base64.b64decode(encrypted_text).decode()
        payload = json.loads(decoded_payload)

        nonce = base64.b64decode(payload["nonce"])
        cipher_bytes = base64.b64decode(payload["cipher"])
        tag = base64.b64decode(payload["tag"])
        key = settings.QR_SECRET_KEY.encode("utf-8")

        print("Decrypting with key:", key)

        aes = AES.new(key, AES.MODE_EAX, nonce=nonce)
        decrypted_bytes = aes.decrypt_and_verify(cipher_bytes, tag)

        return json.loads(decrypted_bytes.decode("utf-8"))

    except (ValueError, KeyError, json.JSONDecodeError) as e:
        raise ValueError(f"Invalid QR data: {e}")
    

