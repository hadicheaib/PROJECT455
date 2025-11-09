from typing import Tuple


class WavFormatError(ValueError):
    pass


def parse_wav(data: bytes) -> Tuple[int, int, int]:
    if data[0:4] != b"RIFF" or data[8:12] != b"WAVE":
        raise WavFormatError("Not RIFF/WAVE")
    offset = 12
    data_offset = -1
    data_size = 0
    audio_format = 0
    bits_per_sample = 0
    channels = 0
    while offset + 8 <= len(data):
        chunk_id = data[offset:offset + 4]
        chunk_size = int.from_bytes(data[offset + 4:offset + 8], "little")
        chunk_data_start = offset + 8
        if chunk_id == b"fmt ":
            audio_format = int.from_bytes(data[chunk_data_start:chunk_data_start + 2], "little")
            channels = int.from_bytes(data[chunk_data_start + 2:chunk_data_start + 4], "little")
            bits_per_sample = int.from_bytes(data[chunk_data_start + 14:chunk_data_start + 16], "little")
        elif chunk_id == b"data":
            data_offset = chunk_data_start
            data_size = chunk_size
        offset = chunk_data_start + chunk_size + (chunk_size & 1)
    if audio_format != 1 or bits_per_sample != 16:
        raise WavFormatError("Require PCM 16-bit WAV")
    if data_offset < 0:
        raise WavFormatError("No data chunk found")
    return data_offset, data_size, channels
