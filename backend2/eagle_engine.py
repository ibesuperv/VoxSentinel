# eagle_engine.py 
import os
import pveagle
from config import ACCESS_KEY, PROFILE_PATH, VERIFY_THRESHOLD


class EagleRecognizer:
    def __init__(self):
        if not os.path.exists(PROFILE_PATH):
            raise FileNotFoundError("Speaker profile missing")

        with open(PROFILE_PATH, "rb") as f:
            profile_bytes = f.read()

        profile = pveagle.EagleProfile.from_bytes(profile_bytes)

        self.eagle = pveagle.create_recognizer(
            access_key=ACCESS_KEY,
            speaker_profiles=[profile]
        )

        self.frame_length = self.eagle.frame_length
        self.sample_rate = self.eagle.sample_rate
        self._last_verified = None

        print("[EAGLE] Ready")

    def process_frame(self, pcm_frame):
        score = self.eagle.process(pcm_frame)[0]
        verified = score >= VERIFY_THRESHOLD

        if verified != self._last_verified:
            self._last_verified = verified

        return verified, score

    def delete(self):
        self.eagle.delete()
