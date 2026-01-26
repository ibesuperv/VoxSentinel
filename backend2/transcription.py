# transcription.py

import numpy as np
from faster_whisper import WhisperModel
from config import WHISPER_MODEL_SIZE, WHISPER_DEVICE, WHISPER_COMPUTE


class RealtimeSTT:
    def __init__(self):
        self.model = WhisperModel(
            WHISPER_MODEL_SIZE,
            device=WHISPER_DEVICE,
            compute_type=WHISPER_COMPUTE,
        )

    def transcribe(self, pcm_int16: np.ndarray, trusted: bool = True) -> str:
        audio = pcm_int16.astype(np.float32) / 32768.0

        segments, _ = self.model.transcribe(
            audio,
            language="en",
            beam_size=5 if trusted else 3,
            best_of=5 if trusted else 3,
            temperature=0.0 if trusted else 0.2,
            vad_filter=not trusted,                    
            condition_on_previous_text=trusted,        
            no_speech_threshold=0.6 if trusted else 0.85,
            log_prob_threshold=-1.0 if trusted else -0.2,
            compression_ratio_threshold=2.0,
        )

        text = " ".join(s.text.strip() for s in segments).strip()

        # FINAL SAFETY: kill hallucinated loops
        if not trusted:
            words = text.lower().split()
            if len(words) >= 4 and len(set(words)) <= 2:
                return ""

        return text
