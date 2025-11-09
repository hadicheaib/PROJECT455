import hashlib
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from Crypto.Util import Counter


SALT = b"stego-fixed-salt"


def derive_key(password: str) -> bytes:
    return hashlib.scrypt(password.encode("utf-8"), salt=SALT, n=1 << 14, r=8, p=1, dklen=32)


def _new_cipher(key: bytes, iv: bytes) -> AES:
    initial_value = int.from_bytes(iv, "big")
    counter = Counter.new(128, initial_value=initial_value)
    return AES.new(key, AES.MODE_CTR, counter=counter)


def encrypt_ctr(key: bytes, plain: bytes) -> bytes:
    iv = get_random_bytes(16)
    cipher = _new_cipher(key, iv)
    ciphertext = cipher.encrypt(plain)
    return iv + ciphertext


def decrypt_ctr(key: bytes, data: bytes) -> bytes:
    if len(data) < 16:
        raise ValueError("Ciphertext too short")
    iv, payload = data[:16], data[16:]
    cipher = _new_cipher(key, iv)
    return cipher.decrypt(payload)
