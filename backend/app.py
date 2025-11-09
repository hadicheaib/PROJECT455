import io
import os
import tempfile
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from dotenv import load_dotenv

from stego.audio import embed_audio, extract_audio
from stego.audio_types import AudioProcessingError
from stego.ffmpeg_utils import run_ffmpeg, FFmpegError

load_dotenv()

app = FastAPI(title="Stego API")

allowed_origin = os.getenv("CORS_ORIGIN", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[allowed_origin] if allowed_origin != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _bool_from_form(value: str) -> bool:
    return value.lower() not in {"false", "0", "no"}


@app.post("/api/audio/embed")
async def audio_embed(
    carrier: UploadFile = File(...),
    message: UploadFile = File(...),
    password: str = Form(...),
    ecc: str = Form("true"),
):
    carrier_bytes = await carrier.read()
    message_bytes = await message.read()
    try:
        stego = embed_audio(carrier_bytes, message_bytes, password, use_ecc=_bool_from_form(ecc))
    except AudioProcessingError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    buffer = io.BytesIO(stego)
    headers = {"Content-Disposition": "attachment; filename=stego.wav"}
    return StreamingResponse(buffer, media_type="audio/wav", headers=headers)


@app.post("/api/audio/extract")
async def audio_extract(
    carrier: UploadFile = File(...),
    password: str = Form(...),
):
    carrier_bytes = await carrier.read()
    try:
        plain = extract_audio(carrier_bytes, password)
    except AudioProcessingError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    try:
        message = plain.decode("utf-8")
    except UnicodeDecodeError:
        message = plain.decode("utf-8", errors="replace")
    return JSONResponse({"message": message})


@app.post("/api/video/embed")
async def video_embed(
    carrier: UploadFile = File(...),
    message: UploadFile = File(...),
    password: str = Form(...),
    ecc: str = Form("true"),
    container: str = Form("mkv"),
):
    temp_flag = _bool_from_form(ecc)
    container = container.lower() or "mkv"
    if not container.isalnum():
        raise HTTPException(status_code=400, detail="Invalid container format")
    with tempfile.TemporaryDirectory(prefix="stego-") as tmpdir:
        in_video = os.path.join(tmpdir, "in_video")
        out_wav = os.path.join(tmpdir, "audio.wav")
        stego_wav = os.path.join(tmpdir, "stego.wav")
        out_video = os.path.join(tmpdir, f"out.{container}")
        in_video_bytes = await carrier.read()
        message_bytes = await message.read()
        with open(in_video, "wb") as fh:
            fh.write(in_video_bytes)
        try:
            run_ffmpeg(["-i", in_video, "-vn", "-acodec", "pcm_s16le", out_wav])
            with open(out_wav, "rb") as fh:
                wav_bytes = fh.read()
            stego_bytes = embed_audio(wav_bytes, message_bytes, password, use_ecc=temp_flag)
            with open(stego_wav, "wb") as fh:
                fh.write(stego_bytes)
            run_ffmpeg([
                "-i", in_video,
                "-i", stego_wav,
                "-map", "0:v:0",
                "-map", "1:a:0",
                "-c:v", "copy",
                "-c:a", "pcm_s16le",
                "-shortest",
                out_video,
            ])
        except (AudioProcessingError, FFmpegError) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        with open(out_video, "rb") as fh:
            content = fh.read()
    mime = {
        "mp4": "video/mp4",
        "mkv": "video/x-matroska",
        "mov": "video/quicktime",
        "avi": "video/x-msvideo",
    }.get(container, "application/octet-stream")
    headers = {"Content-Disposition": f"attachment; filename=stego.{container}"}
    return StreamingResponse(io.BytesIO(content), media_type=mime, headers=headers)


@app.post("/api/video/extract")
async def video_extract(
    carrier: UploadFile = File(...),
    password: str = Form(...),
):
    with tempfile.TemporaryDirectory(prefix="stego-") as tmpdir:
        in_video = os.path.join(tmpdir, "in_video.mkv")
        out_wav = os.path.join(tmpdir, "audio.wav")
        in_video_bytes = await carrier.read()
        with open(in_video, "wb") as fh:
            fh.write(in_video_bytes)
        try:
            run_ffmpeg(["-i", in_video, "-vn", "-acodec", "pcm_s16le", out_wav])
            with open(out_wav, "rb") as fh:
                wav_bytes = fh.read()
            plain = extract_audio(wav_bytes, password)
        except (AudioProcessingError, FFmpegError) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    try:
        message = plain.decode("utf-8")
    except UnicodeDecodeError:
        message = plain.decode("utf-8", errors="replace")
    return JSONResponse({"message": message})


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "3001"))
    uvicorn.run(app, host="0.0.0.0", port=port)
