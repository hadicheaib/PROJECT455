import io
import os
import tempfile
from typing import Optional

from PIL import Image
from cryptosteganography import CryptoSteganography


class ImageStegoError(Exception):
    """Raised when image steganography operations fail."""


def _ensure_password(password: str) -> None:
    if not password:
        raise ImageStegoError("Password is required for image steganography")


def embed_image(
    carrier_bytes: bytes,
    password: str,
    *,
    secret_message: Optional[str] = None,
    secret_file: Optional[bytes] = None,
    secret_filename: Optional[str] = None,
) -> bytes:
    """
    Hide a message or file inside an image using CryptoSteganography.

    One of secret_message or secret_file must be provided.
    The carrier image is normalised to PNG to ensure lossless storage.
    """
    _ensure_password(password)

    if not secret_message and not secret_file:
        raise ImageStegoError("Either secret_message or secret_file must be provided")

    with tempfile.TemporaryDirectory(prefix="image-stego-") as tmpdir:
        carrier_path = os.path.join(tmpdir, "carrier.png")
        stego_path = os.path.join(tmpdir, "stego.png")

        try:
            Image.open(io.BytesIO(carrier_bytes)).convert("RGB").save(carrier_path, format="PNG")
        except Exception as exc:  # pragma: no cover - pillow raises various exceptions
            raise ImageStegoError("Unsupported or corrupted carrier image") from exc

        steg = CryptoSteganography(password)

        try:
            if secret_file is not None:
                secret_name = secret_filename or "secret.bin"
                secret_path = os.path.join(tmpdir, secret_name)
                with open(secret_path, "wb") as secret_fh:
                    secret_fh.write(secret_file)
                steg.hide(carrier_path, stego_path, secret_file=secret_path)
            else:
                steg.hide(
                    carrier_path,
                    stego_path,
                    secret_message=secret_message or "",
                )
        except Exception as exc:  # pragma: no cover - library raises RuntimeError
            raise ImageStegoError("Failed to embed message in image") from exc

        try:
            with open(stego_path, "rb") as fh:
                return fh.read()
        except FileNotFoundError as exc:  # pragma: no cover
            raise ImageStegoError("Unable to create stego image") from exc

def extract_image(stego_bytes: bytes, password: str) -> tuple[Optional[str], Optional[bytes], Optional[str]]:
    """Retrieve a hidden message or file from an image using CryptoSteganography."""
    _ensure_password(password)

    with tempfile.TemporaryDirectory(prefix="image-stego-") as tmpdir:
        stego_path = os.path.join(tmpdir, "stego.png")

        try:
            Image.open(io.BytesIO(stego_bytes)).convert("RGB").save(stego_path, format="PNG")
        except Exception as exc:  # pragma: no cover
            raise ImageStegoError("Unsupported or corrupted stego image") from exc

        steg = CryptoSteganography(password)

        try:
            result: Optional[str] = steg.retrieve(stego_path)
        except Exception as exc:  # pragma: no cover
            raise ImageStegoError("Failed to extract message from image") from exc

        if result is None:
            raise ImageStegoError("No hidden message or file found in image")

        if os.path.isfile(result):
            filename = os.path.basename(result)
            with open(result, "rb") as fh:
                return None, fh.read(), filename

        return result, None, None

