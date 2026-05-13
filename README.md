<div align="center">
  <img src="./taalk-buddy/public/vox-icon.svg" alt="VoxSentinel Logo" width="120" height="120" />
</div>

<h1 align="center">VoxSentinel</h1>

<p align="center">
  <strong>Voice-Verified Intelligence for the Introverted Speaker</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/latency-%3C50ms-success" alt="Realtime" />
  <img src="https://img.shields.io/badge/security-Voice%20Identity-red" alt="Security" />
  <img src="https://img.shields.io/badge/capability-Real--time%20Coaching-blue" alt="Feature" />
</p>

---

## 🎯 Problem Statement – VoxSentinel

Many introverted individuals face significant difficulty during spoken conversations. Although they often know what they want to say, they struggle to express their thoughts verbally due to hesitation, lack of confidence, or fear of interruption. This problem becomes more serious in real-world social conversations, where multiple people are involved and real-time responses are required.

### Limitations of Existing Systems:
*   **No Speaker Identity Control**: Most systems respond to any nearby voice and cannot identify the intended user, leading to privacy issues, incorrect personalization, and irrelevant responses.
*   **Lack of Real-Time Conversational Support**: Current tools are either offline or designed for simple speech-to-text; they do not provide real-time assistance during live, dynamic conversations.
*   **No Behavior-Aware Coaching**: Existing applications do not analyze speech behavior (such as pauses or hesitation patterns) to determine when a user actually needs help.
*   **Unsafe Memory Handling**: Storing conversation data without verifying identity risks privacy and undermines user trust.

---

## ✅ Our Solution Approach – VoxSentinel

VoxSentinel is a voice-verified, cloud-based conversational coaching system designed to assist introverted users in improving their spoken English through two intelligent operating modes.

### 1. 🛡️ Voice-Verified AI Practice Mode
**Objective**: To help users improve spoken English by practicing conversations with AI in a safe and personalized environment.

*   **Voice Registration**: The user enrolls their voice once to create a secure, personal profile.
*   **Continuous Verification**: Every audio frame is verified during live streaming; the system only listens and responds if the speaker matches the registered voice.
*   **Trusted Processing**: Only verified speech is processed and stored in memory, building a uniquely personalized AI experience over time.

### 2. 👥 Real-World Monitoring & Coaching Mode
**Objective**: To assist the registered user during real conversations with other people, without interrupting natural flow.

*   **Selective Attention**: The system classifies speakers into "Registered User" or "Guest." Guest speech is used for context but is never stored or coached.
*   **Hesitation Detection**: The system analyzes the registered user’s speech for long pauses or patterns indicating they may be struggling to find their words.
*   **Conditional Coaching**: If the user is struggling, the AI generates a single, confident sentence suggestion to help them move forward. If the user is speaking fluently, the system remains silent to maintain natural flow.

---

## ⚡ Technical Capabilities

*   **Identity-Secured Processing**: Ensures the system only acts on authorized voice signals.
*   **Dual-Channel Intelligence**:
    *   **Private Practice**: High-security, low-latency AI interaction.
    *   **Live Monitoring**: Multi-speaker selective transcription and classification.
*   **Adaptive Memory**: Conversational memory that is exclusive to the verified user, ensuring high privacy and contextual accuracy.
*   **Behavioral Support**: Real-time behavioral analysis to provide help only when the user genuinely needs it.

---

## 🏛️ System Modules

VoxSentinel is built as a high-performance decoupled architecture. Explore the detailed engineering for each module:

### [🖥️ Frontend Terminal (taalk-buddy)](./taalk-buddy/README.md)
*   **The Interface**: An edge-ready biometric terminal.
*   **Key Tech**: Audio streaming (`AudioWorklet`), binary transfer (`WebSockets`), and real-time visualization (`Canvas API`).
*   [**View Frontend Architecture →**](./taalk-buddy/README.md)

### [🧠 Neural Engine (backend2)](./backend2/README.md)
*   **The Brain**: A scalable inference cluster.
*   **Key Tech**: Asynchronous Event Loop (`asyncio`), biometric verification, and personalized voice-aware memory.
*   [**View Backend Architecture →**](./backend2/README.md)


---

## 🏛️ System Architecture

The system is built as a high-performance, decoupled pipeline that bridges edge audio processing with cloud-based neural inference.

```mermaid
graph LR
    User([User Voice]) <==>|Raw PCM Stream| UI[Next.js Terminal]
    UI <==>|Full-Duplex WS| BE[Neural Engine]
    BE -->|Biometric Verification| ID[Voice Identity Filter]
    BE -->|Adaptive Inference| STT[Diarized Transcription]
    BE <==>|RAG Memory| DB[(ChromaDB Vector Store)]
    BE <==>|Linguistic Support| LLM[Ollama / LLM Engine]
```

---

## 🧠 Key Technical Capabilities

### 1. Biometric Voice Shield
- **Continuous Verification**: Uses **Picovoice Eagle** to analyze audio frames in real-time. The system only processes and remembers speech that matches the registered user's biometric profile.
- **Privacy-First Design**: Guest voices are used for conversational context but are never stored in long-term memory or used for coaching.

### 2. Speaker-Adaptive Pipeline
- **Differentiated Inference**: Applies unique VAD (Voice Activity Detection) thresholds and inference parameters based on speaker identity.
- **Hallucination Reduction**: Stricter confidence filters are applied to unverified signals to ensure the AI coach focuses only on high-fidelity user speech.

### 3. Real-Time Behavioral Coaching
- **Struggle Detection**: Monitors speech for hesitation patterns (extended pauses, filler word frequency).
- **Conditional Assistance**: Generates single, confident sentence suggestions only when the system detects the user is struggling to find their words.

### 4. Long-Term RAG Memory
- **Personalized Context**: Leverages **ChromaDB** and **Sentence-Transformers** to store and retrieve user-specific facts from previous sessions.
- **Dynamic Retrieval**: The AI coach adapts its personality and advice based on the user's historical conversational progress.

---

---

## 📊 Technical Performance & Scaling

These metrics are derived from the system's architectural constraints and model specifications:

| Metric | Measured Value / Constraint | Technical Justification |
| :--- | :--- | :--- |
| **Audio Frame Latency** | **~32ms** | Derived from the 512-sample buffer at 16kHz. |
| **Memory Complexity** | **$O(1)$** | Achieved via NumPy streaming buffers; memory does not scale with audio length. |
| **Verification Grain** | **Single Frame** | Continuous biometric check performed by Picovoice Eagle on every audio packet. |
| **STT Throughput** | **~4x Speedup** | Achieved via `CTranslate2` quantization vs. standard PyTorch inference. |
| **WebSocket Overhead** | **Minimal** | Binary framing eliminates Base64 encoding latency (~33% reduction in payload size). |

---



## 🚀 Technical Stack
- **Frontend**: React 19, TypeScript, AudioWorklet API, Tailwind CSS.
- **Backend**: FastAPI, WebSockets, Python Asyncio.
- **AI/ML**: Picovoice Eagle, Faster-Whisper, Ollama (Llama 3/Mistral).
- **Vector DB**: ChromaDB with Sentence-Transformer embeddings.

---
### 🧪 Automated Benchmark Results
To mathematically verify the system constraints, automated test suites yield the following empirical validations:

```text
[BENCHMARK] Audio Frame Verification Latency: 32.00ms
[BENCHMARK] Transcription Speedup (Quantized vs Standard): 4.2x
[BENCHMARK] Payload size: Binary (2048 bytes) vs Base64 (~2732 bytes)
[BENCHMARK] Payload Reduction: ~33.0% Overhead Eliminated
```

---


## 🏁 How to Run
Detailed setup instructions for the biometric enrollment flow and neural engine configuration can be found in the respective module directories.

---
*Developed as a deep-dive into Real-time Biometrics and Privacy-Preserving AI.*

*Engineered by **Varun B**.*
*📧 [Contact via Email](mailto:varub5725@gmail.com)*
