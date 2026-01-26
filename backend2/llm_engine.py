# llm_engine.py

from ollama import Client
from collections import deque
from config import SYSTEM_PROMPT, OLLAMA_MODEL, OLLAMA_URL
from memory_engine import MemorySystem


MEMORY_EXTRACTION_PROMPT = """
You are a personal memory extractor.

Decide if the user's message contains a stable personal fact, event, or important information worth remembering.
Examples:
- "I work as a software engineer at Google" → STORE
- "My name is Varun" → STORE
- "I feel sick today" → STORE
- "How are you?" → DO NOT STORE

Reply with:
STORE: <cleaned memory text>
or
IGNORE
"""


class EnglishTeacher:
    def __init__(self):
        self.client = Client(host=OLLAMA_URL)
        self.memory = MemorySystem()
        self.history = deque(maxlen=6)

    def chat(self, user_text: str):
        # 1️⃣ RETRIEVE RELEVANT MEMORIES (RAG)
        memories = self.memory.retrieve(user_text)

        # 2️⃣ BUILD CONTEXT
        memory_context = ""
        if memories:
            memory_context = "\nKNOWN FACTS ABOUT USER:\n" + "\n".join(
                f"- {m}" for m in memories
            )

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT + memory_context}
        ]
        messages.extend(self.history)
        messages.append({"role": "user", "content": user_text})

        # 3️⃣ GENERATE RESPONSE
        response = self.client.chat(
            model=OLLAMA_MODEL,
            messages=messages,
        )

        ai_text = response["message"]["content"]

        self.history.append({"role": "user", "content": user_text})
        self.history.append({"role": "assistant", "content": ai_text})

        # 4️⃣ MEMORY EXTRACTION (AI-DECIDED)
        mem_decision = self.client.chat(
            model=OLLAMA_MODEL,
            messages=[
                {"role": "system", "content": MEMORY_EXTRACTION_PROMPT},
                {"role": "user", "content": user_text}
            ]
        )["message"]["content"].strip()

        if mem_decision.startswith("STORE:"):
            memory_text = mem_decision.replace("STORE:", "").strip()
            self.memory.store(memory_text)

        return ai_text
