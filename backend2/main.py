# main.py 

import asyncio
import io
import os
from concurrent.futures import ThreadPoolExecutor
from fastapi import WebSocketDisconnect
import webrtcvad


import numpy as np
import soundfile as sf
from fastapi import (
    FastAPI,
    WebSocket,
    UploadFile,
    File,
    Form,
    HTTPException,
)
from fastapi.middleware.cors import CORSMiddleware

from enrollment import enroll_from_pcm
from eagle_engine import EagleRecognizer
from transcription import RealtimeSTT
from llm_engine import EnglishTeacher
from config import (
    PROFILE_PATH,
    VERIFY_THRESHOLD,
    GRACE_PERIOD_FRAMES,
    MIN_TRANSCRIPTION_LENGTH_SEC,
)
import re

SAMPLE_RATE = 16000
VAD_FRAME_MS = 30
VAD_FRAME_SAMPLES = int(SAMPLE_RATE * VAD_FRAME_MS / 1000)

app = FastAPI()
executor = ThreadPoolExecutor(max_workers=4)

stt_engine = RealtimeSTT()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "TalkBuddy Backend Running"}


@app.post("/api/enroll-voice")
async def enroll_voice(
    name: str = Form(...),
    audio: UploadFile = File(...),
):
    print("[ENROLL] Request received")

    if not audio.filename.lower().endswith(".wav"): # type: ignore
        raise HTTPException(400, "WAV required")

    pcm, sr = sf.read(io.BytesIO(await audio.read()), dtype="int16")

    if sr != SAMPLE_RATE:
        raise HTTPException(400, "16kHz audio required")

    if pcm.ndim > 1:
        pcm = pcm[:, 0]

    loop = asyncio.get_running_loop()
    await loop.run_in_executor(executor, enroll_from_pcm, pcm)

    print("[ENROLL] Completed successfully")
    return {"success": True}


@app.websocket("/ws/talk")
async def ws_talk(ws: WebSocket):
    await ws.accept()
    print("[WS] Connected")

    if not os.path.exists(PROFILE_PATH):
        await ws.close()
        return

    recognizer = EagleRecognizer()
    teacher = EnglishTeacher()

    buffer = np.zeros(0, dtype=np.int16)
    speech_frames = []

    is_recording = False
    grace = 0

    try:
        while True:
            try:
                msg = await ws.receive()
            except WebSocketDisconnect:
                print("[WS] Client disconnected")
                break

            if msg["type"] == "websocket.disconnect":
                print("[WS] Disconnect event")
                break


            # ----------------------------------
            # 1️⃣ HEARTBEAT / PING (KEEP ALIVE)
            # ----------------------------------
            if "text" in msg:
                # Frontend sends { type: "ping" }
                continue

            # ----------------------------------
            # 2️⃣ AUDIO FRAMES
            # ----------------------------------
            data = msg.get("bytes")
            if not data:
                continue

            pcm_f32 = np.frombuffer(data, dtype=np.float32)
            pcm_i16 = (pcm_f32 * 32767).astype(np.int16)
            buffer = np.concatenate([buffer, pcm_i16])

            # ----------------------------------
            # 3️⃣ FRAME LOOP
            # ----------------------------------
            while len(buffer) >= recognizer.frame_length:
                frame = buffer[:recognizer.frame_length]
                buffer = buffer[recognizer.frame_length:]

                verified, score = recognizer.process_frame(frame)

                # 🔹 Send verification status (frontend shield UI)
                await ws.send_json({
                    "type": "status",
                    "status": "VERIFIED" if verified else "NOT VERIFIED",
                    "confidence": round(float(score), 3),
                })

                # ----------------------------------
                # 4️⃣ RECORDING LOGIC
                # ----------------------------------
                if verified:
                    is_recording = True
                    grace = GRACE_PERIOD_FRAMES
                    speech_frames.append(frame)

                elif is_recording and grace > 0:
                    speech_frames.append(frame)
                    grace -= 1

                elif is_recording:
                    # 🔚 SPEECH END
                    is_recording = False

                    audio = np.concatenate(speech_frames)
                    speech_frames = []

                    duration = len(audio) / 16000
                    if duration < MIN_TRANSCRIPTION_LENGTH_SEC:
                        continue

                    # ----------------------------------
                    # 5️⃣ STT
                    # ----------------------------------
                    loop = asyncio.get_event_loop()
                    user_text = await loop.run_in_executor(
                        executor, stt_engine.transcribe, audio
                    )

                    if not user_text:
                        continue
                    print(f"\n[STT] USER: {user_text}")
                    await ws.send_json({
                        "type": "transcription",
                        "text": user_text,
                    })

                    # ----------------------------------
                    # 6️⃣ AI RESPONSE
                    # ----------------------------------
                    ai_text = await loop.run_in_executor(
                        executor, teacher.chat, user_text
                    )
                    print(f"\n[AI] ASSISTANT: {ai_text}")

                    await ws.send_json({
                        "type": "response",
                        "text": ai_text,
                    })

    except WebSocketDisconnect:
        print("[WS] Client closed connection")
    finally:
        recognizer.delete()
        print("[WS] Session ended")





HESITATION_KEYWORDS = {
    "uh", "um", "umm", "hmm", "ha", "ah",
    "i", "i i", "i uh", "i um",
    "i think", "maybe", "like", "you know", "uh"
}

STRUGGLE_THRESHOLD = 3

@app.websocket("/ws/conversation")
async def ws_conversation(ws: WebSocket):
    await ws.accept()
    print("[WS] Conversation Connected (Final Stable Guest STT)")

    recognizer = EagleRecognizer()
    stt_engine = RealtimeSTT()
    teacher = EnglishTeacher()

    buffer = np.zeros(0, dtype=np.int16)
    speech_frames = []

    is_recording = False
    silence_frames = 0
    max_confidence = 0.0

    # ---- tuned thresholds ----
    MAX_SILENCE_FRAMES = 18          # ~540 ms
    MIN_REG_DURATION = 0.5           # seconds
    MIN_GUEST_DURATION = 1.0         # seconds
    MIN_GUEST_RMS = 0.008

    last_coach_time = 0
    COACH_COOLDOWN_SEC = 8

    def rms_ok(audio: np.ndarray) -> bool:
        audio_f = audio.astype(np.float32) / 32768.0
        rms = np.sqrt(np.mean(audio_f ** 2))
        return rms >= MIN_GUEST_RMS

    try:
        while True:
            msg = await ws.receive()
            if msg["type"] == "websocket.disconnect":
                break
            if "text" in msg:
                continue

            pcm_f32 = np.frombuffer(msg["bytes"], dtype=np.float32)
            pcm_i16 = (pcm_f32 * 32767).astype(np.int16)
            buffer = np.concatenate([buffer, pcm_i16])

            while len(buffer) >= recognizer.frame_length:
                frame = buffer[:recognizer.frame_length]
                buffer = buffer[recognizer.frame_length:]

                _, score = recognizer.process_frame(frame)
                confidence = float(score)
                max_confidence = max(max_confidence, confidence)

                current_speaker = (
                    "registered_user"
                    if confidence >= VERIFY_THRESHOLD
                    else "unregistered_user"
                )

                await ws.send_json({
                    "type": "status",
                    "speaker": current_speaker,
                    "confidence": round(confidence, 3),
                })

                # ----- speech detection (energy only) -----
                rms = np.sqrt(np.mean(frame.astype(np.float32) ** 2)) / 32768.0
                is_speech = rms > 0.006

                if is_speech:
                    silence_frames = 0
                    is_recording = True
                    speech_frames.append(frame)
                elif is_recording:
                    silence_frames += 1
                    speech_frames.append(frame)

                # ----- end of utterance -----
                if is_recording and silence_frames >= MAX_SILENCE_FRAMES:
                    is_recording = False
                    silence_frames = 0

                    audio = np.concatenate(speech_frames)
                    speech_frames = []

                    duration = len(audio) / SAMPLE_RATE
                    final_speaker = (
                        "registered_user"
                        if max_confidence >= VERIFY_THRESHOLD
                        else "unregistered_user"
                    )

                    # -------- HARD GATES --------
                    if final_speaker == "unregistered_user":
                        if duration < MIN_GUEST_DURATION:
                            max_confidence = 0.0
                            continue
                        if not rms_ok(audio):
                            print("[NOISE] Dropped guest noise")
                            max_confidence = 0.0
                            continue
                    else:
                        if duration < MIN_REG_DURATION:
                            max_confidence = 0.0
                            continue

                    # -------- STT --------
                    trusted = final_speaker == "registered_user"
                    loop = asyncio.get_running_loop()

                    text = await loop.run_in_executor(
                        executor,
                        stt_engine.transcribe,
                        audio,
                        trusted
                    )

                    if not text:
                        max_confidence = 0.0
                        continue

                    print(f"[TRANSCRIPT] {final_speaker} ({max_confidence:.2f}): {text}")

                    await ws.send_json({
                        "type": "transcription",
                        "speaker": final_speaker,
                        "confidence": round(max_confidence, 3),
                        "text": text,
                    })

                    # -------- AI COACH (REGISTERED ONLY) --------
                    if final_speaker == "registered_user":
                        norm = text.lower()
                        struggle_count = sum(norm.count(k) for k in HESITATION_KEYWORDS)

                        now = asyncio.get_event_loop().time()
                        if (
                            struggle_count >= STRUGGLE_THRESHOLD
                            and now - last_coach_time > COACH_COOLDOWN_SEC
                        ):
                            print("[BEHAVIOR] Registered user struggling")

                            coach_text = await loop.run_in_executor(
                                executor,
                                teacher.chat,
                                f"User is struggling. Suggest one confident sentence.\nUser said: {text}"
                            )

                            print(f"[COACH] {coach_text}")

                            await ws.send_json({
                                "type": "coach",
                                "text": coach_text,
                            })

                            last_coach_time = now

                    max_confidence = 0.0

    except WebSocketDisconnect:
        print("[WS] Conversation closed")
    finally:
        recognizer.delete()
        print("[WS] Conversation session ended")

