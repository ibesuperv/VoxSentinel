# enrollment.py 
import os
import numpy as np
import pveagle
from config import ACCESS_KEY, DATA_DIR, PROFILE_PATH
from memory_engine import MemorySystem

os.makedirs(DATA_DIR, exist_ok=True)


def enroll_from_pcm(pcm_int16: np.ndarray):
    print("[ENROLL] Starting enrollment")

    # Reset memory on new voice
    MemorySystem(reset=True)

    profiler = pveagle.create_profiler(access_key=ACCESS_KEY)

    try:
        frame_len = profiler.min_enroll_samples
        cursor = 0
        percent = 0.0

        while percent < 100.0 and cursor + frame_len <= len(pcm_int16):
            frame = pcm_int16[cursor: cursor + frame_len]
            cursor += frame_len
            percent, _ = profiler.enroll(frame) # type: ignore

        if percent < 100.0:
            raise RuntimeError("Not enough clean speech")

        profile = profiler.export()
        with open(PROFILE_PATH, "wb") as f:
            f.write(profile.to_bytes())

        print("[ENROLL] Completed")

    finally:
        profiler.delete()
