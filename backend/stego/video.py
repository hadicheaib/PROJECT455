import os
import tempfile

import cv2  # type: ignore
import numpy as np  # type: ignore
from typing import Optional, Tuple

from .ffmpeg_utils import FFmpegError, run_ffmpeg
from .image import ImageStegoError, embed_image, extract_image


class VideoStegoError(Exception):
    """Raised when video steganography operations fail."""


def _ensure_password(password: str) -> None:
    if not password:
        raise VideoStegoError("Password is required for video steganography")


def embed_video(
    video_bytes: bytes,
    password: str,
    container: str = "mp4",
    *,
    secret_message: Optional[str] = None,
    secret_file: Optional[bytes] = None,
    secret_filename: Optional[str] = None,
) -> Tuple[bytes, str]:
    """Embed a message or file into the first frame of a video."""
    _ensure_password(password)
    if not secret_message and not secret_file:
        raise VideoStegoError("Either secret_message or secret_file must be provided")

    container = (container or "mp4").lower()
    if not container.isalnum():
        container = "mp4"

    with tempfile.TemporaryDirectory(prefix="video-stego-") as tmpdir:
        input_path = os.path.join(tmpdir, "input_video")
        with open(input_path, "wb") as fh:
            fh.write(video_bytes)

        capture = cv2.VideoCapture(input_path)
        if not capture.isOpened():
            raise VideoStegoError("Unable to read carrier video")

        fps = capture.get(cv2.CAP_PROP_FPS) or 30.0
        width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))

        success, first_frame = capture.read()
        if not success or first_frame is None:
            capture.release()
            raise VideoStegoError("Video does not contain readable frames")

        # Hide message inside the first frame using the image steganography helper.
        success, frame_buffer = cv2.imencode(".png", first_frame)
        if not success:
            capture.release()
            raise VideoStegoError("Failed to serialise video frame")

        try:
            encoded_frame_bytes = embed_image(
                frame_buffer.tobytes(),
                password,
                secret_message=secret_message,
                secret_file=secret_file,
                secret_filename=secret_filename,
            )
        except ImageStegoError as exc:
            capture.release()
            raise VideoStegoError(str(exc)) from exc

        encoded_frame_array = cv2.imdecode(
            np.frombuffer(encoded_frame_bytes, dtype=np.uint8), cv2.IMREAD_COLOR
        )
        if encoded_frame_array is None:
            capture.release()
            raise VideoStegoError("Failed to decode encoded frame")

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        video_no_audio_path = os.path.join(tmpdir, "encoded_video.mp4")
        writer = cv2.VideoWriter(video_no_audio_path, fourcc, fps, (width, height))
        if not writer.isOpened():
            capture.release()
            raise VideoStegoError("Unable to create output video")

        writer.write(encoded_frame_array)
        while True:
            success, frame = capture.read()
            if not success:
                break
            writer.write(frame)

        writer.release()
        capture.release()

        final_output_path = os.path.join(tmpdir, f"stego_video.{container}")
        try:
            run_ffmpeg(
                [
                    "-i",
                    video_no_audio_path,
                    "-i",
                    input_path,
                    "-c",
                    "copy",
                    "-map",
                    "0:v:0",
                    "-map",
                    "1:a:0",
                    final_output_path,
                ]
            )
            output_path = final_output_path
        except FFmpegError:
            # Fall back to the video without audio if we cannot remux the original track.
            output_path = video_no_audio_path
            container = "mp4"

        with open(output_path, "rb") as fh:
            data = fh.read()

        extension = os.path.splitext(output_path)[1].lstrip(".").lower() or "mp4"
        return data, extension


def extract_video(video_bytes: bytes, password: str) -> tuple[Optional[str], Optional[bytes], Optional[str]]:
    """Extract a hidden payload from the first frame of a video."""
    _ensure_password(password)

    with tempfile.TemporaryDirectory(prefix="video-stego-") as tmpdir:
        input_path = os.path.join(tmpdir, "stego_video")
        with open(input_path, "wb") as fh:
            fh.write(video_bytes)

        capture = cv2.VideoCapture(input_path)
        if not capture.isOpened():
            raise VideoStegoError("Unable to read stego video")

        success, first_frame = capture.read()
        capture.release()
        if not success or first_frame is None:
            raise VideoStegoError("Video does not contain readable frames")

        success, frame_buffer = cv2.imencode(".png", first_frame)
        if not success:
            raise VideoStegoError("Failed to serialise video frame")

        try:
            message, file_bytes, filename = extract_image(frame_buffer.tobytes(), password)
        except ImageStegoError as exc:
            raise VideoStegoError(str(exc)) from exc

        return message, file_bytes, filename

