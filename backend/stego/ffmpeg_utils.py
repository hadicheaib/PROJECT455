import os
import subprocess


class FFmpegError(RuntimeError):
    pass


def run_ffmpeg(args: list[str]) -> None:
    binary = os.getenv("FFMPEG_PATH", "ffmpeg")
    process = subprocess.run([binary, "-y", *args], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if process.returncode != 0:
        raise FFmpegError(process.stderr.decode("utf-8", errors="ignore") or f"ffmpeg exited with {process.returncode}")
