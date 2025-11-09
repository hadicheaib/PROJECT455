from typing import Iterable, List


def bytes_to_bits(data: Iterable[int]) -> List[int]:
    bits: List[int] = []
    for byte in data:
        for shift in range(7, -1, -1):
            bits.append((byte >> shift) & 1)
    return bits


def bits_to_bytes(bits: Iterable[int]) -> bytes:
    out = bytearray()
    byte = 0
    count = 0
    for bit in bits:
        byte = (byte << 1) | (bit & 1)
        count += 1
        if count == 8:
            out.append(byte)
            byte = 0
            count = 0
    if count:
        byte <<= 8 - count
        out.append(byte)
    return bytes(out)


def hamming_encode(bits: Iterable[int]) -> List[int]:
    encoded: List[int] = []
    chunk: List[int] = []
    for bit in bits:
        chunk.append(bit & 1)
        if len(chunk) == 4:
            d1, d2, d3, d4 = chunk
            p1 = d1 ^ d2 ^ d4
            p2 = d1 ^ d3 ^ d4
            p3 = d2 ^ d3 ^ d4
            encoded.extend([p1, p2, d1, p3, d2, d3, d4])
            chunk.clear()
    if chunk:
        while len(chunk) < 4:
            chunk.append(0)
        encoded.extend(hamming_encode(chunk))
    return encoded


def hamming_decode(bits: Iterable[int]) -> List[int]:
    decoded: List[int] = []
    chunk: List[int] = []
    for bit in bits:
        chunk.append(bit & 1)
        if len(chunk) == 7:
            p1, p2, d1, p3, d2, d3, d4 = chunk
            s1 = p1 ^ d1 ^ d2 ^ d4
            s2 = p2 ^ d1 ^ d3 ^ d4
            s3 = p3 ^ d2 ^ d3 ^ d4
            syndrome = (s3 << 2) | (s2 << 1) | s1
            if 1 <= syndrome <= 7:
                chunk[syndrome - 1] ^= 1
            decoded.extend([chunk[2], chunk[4], chunk[5], chunk[6]])
            chunk.clear()
    return decoded
