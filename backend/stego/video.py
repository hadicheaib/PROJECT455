import os
import tempfile
from typing import Optional, Tuple

import cv2
import numpy as np

from .image import embed_image, extract_image, ImageStegoError
from .ffmpeg_utils import run_ffmpeg, FFmpegError


class VideoStegoError(Exception):
    """Raised when video steganography operations fail."""


def _ensure_password(password: str) -> None:
    if not password:
        raise VideoStegoError("Password is required for video steganography")


# ---------------------------------------------------------------------
#                            EMBED VIDEO
# ---------------------------------------------------------------------
def embed_video(
    video_bytes: bytes,
    password: str,
    container: str = "mp4",
    *,
    secret_message: Optional[str] = None,
    secret_file: Optional[bytes] = None,
    secret_filename: Optional[str] = None,
) -> Tuple[bytes, str]:

    _ensure_password(password)

    if not secret_message and not secret_file:
        raise VideoStegoError("Either secret_message or secret_file must be provided")

    container = (container or "mp4").lower()
    if not container.isalnum():
        container = "mp4"

    with tempfile.TemporaryDirectory(prefix="video-stego-") as tmpdir:

        # ----------------------------------------------------------
        # 💠 1. Write uploaded video to disk
        # ----------------------------------------------------------
        input_path = os.path.join(tmpdir, "input.mp4")
        with open(input_path, "wb") as fh:
            fh.write(video_bytes)

        # ----------------------------------------------------------
        # 💠 2. Downscale to 720p using FFmpeg (HUGE speed boost)
        # ----------------------------------------------------------
        scaled_path = os.path.join(tmpdir, "scaled_720p.mp4")
        try:
            run_ffmpeg(
                [
                    "-i", input_path,
                    "-vf", "scale=1280:720",
                    "-preset", "fast",
                    scaled_path,
                ]
            )
        except FFmpegError:
            raise VideoStegoError("Failed to downscale video")

        # Open downscaled video
        cap = cv2.VideoCapture(scaled_path)
        if not cap.isOpened():
            raise VideoStegoError("Unable to read downscaled video")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        # ----------------------------------------------------------
        # 💠 3. Read first frame
        # ----------------------------------------------------------
        ok, first_frame = cap.read()
        if not ok or first_frame is None:
            cap.release()
            raise VideoStegoError("Video does not contain readable frames")

        # Convert first frame → BMP buffer (lossless)
        ok, bmp_buffer = cv2.imencode(".bmp", first_frame, [])
        if not ok:
            cap.release()
            raise VideoStegoError("Failed to encode frame as BMP")

        # ----------------------------------------------------------
        # 💠 4. Embed message/file in BMP using image stego
        # ----------------------------------------------------------
        try:
            encoded_frame_bytes = embed_image(
                bmp_buffer.tobytes(),
                password,
                secret_message=secret_message,
                secret_file=secret_file,
                secret_filename=secret_filename,
            )
        except ImageStegoError as exc:
            cap.release()
            raise VideoStegoError(f"Image stego failed: {exc}") from exc

        # Convert modified BMP → ndarray
        encoded_frame_array = cv2.imdecode(
            np.frombuffer(encoded_frame_bytes, dtype=np.uint8),
            cv2.IMREAD_COLOR,
        )
        if encoded_frame_array is None:
            cap.release()
            raise VideoStegoError("Failed to decode encoded BMP frame")

        # ----------------------------------------------------------
        # 💠 5. Create output video using a FAST lossless codec
        # ----------------------------------------------------------
        no_audio_path = os.path.join(tmpdir, "video_no_audio.avi")

        # ⚡ HFYU = FAST, LOSSLESS, WINDOWS-COMPATIBLE
        fourcc = cv2.VideoWriter_fourcc(*"HFYU")

        writer = cv2.VideoWriter(no_audio_path, fourcc, fps, (width, height))
        if not writer.isOpened():
            cap.release()
            raise VideoStegoError("Unable to create lossless output video")

        # Write modified first frame
        writer.write(encoded_frame_array)

        # Write all other frames unchanged
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            writer.write(frame)

        writer.release()
        cap.release()

        # ----------------------------------------------------------
        # 💠 6. Merge audio from original video
        # ----------------------------------------------------------
        output_path = os.path.join(tmpdir, f"stego_output.{container}")

        try:
            run_ffmpeg(
                [
                    "-i", no_audio_path,
                    "-i", input_path,
                    "-c:v", "copy",
                    "-map", "0:v:0",
                    "-map", "1:a:0",
                    output_path,
                ]
            )
        except FFmpegError:
            # fallback — deliver AVI if remux fails
            output_path = no_audio_path
            container = "avi"

        # ----------------------------------------------------------
        # 💠 7. Return final stego video bytes
        # ----------------------------------------------------------
        with open(output_path, "rb") as fh:
            final_bytes = fh.read()

        extension = os.path.splitext(output_path)[1].lstrip(".").lower()
        return final_bytes, extension


# ---------------------------------------------------------------------
#                            EXTRACT VIDEO
# ---------------------------------------------------------------------
def extract_video(
    video_bytes: bytes, password: str
) -> tuple[Optional[str], Optional[bytes], Optional[str]]:

    _ensure_password(password)

    with tempfile.TemporaryDirectory(prefix="video-stego-") as tmpdir:

        # Save uploaded stego video
        video_path = os.path.join(tmpdir, "stego_video.avi")
        with open(video_path, "wb") as fh:
            fh.write(video_bytes)

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise VideoStegoError("Unable to read stego video")

        ok, first_frame = cap.read()
        cap.release()
        if not ok or first_frame is None:
            raise VideoStegoError("Video does not contain readable frames")

        # Convert to BMP
        ok, bmp_buffer = cv2.imencode(".bmp", first_frame, [])
        if not ok:
            raise VideoStegoError("Failed to serialise video frame to BMP")

        # Extract hidden data
        try:
            message, file_bytes, filename = extract_image(
                bmp_buffer.tobytes(), password
            )
        except ImageStegoError as exc:
            raise VideoStegoError(f"Image extraction failed: {exc}") from exc

        return message, file_bytes, filename
