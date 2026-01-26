<div align="center">
  <img src="./taalk-buddy/public/vox-icon.svg" alt="VoxSentinel Logo" width="120" height="120" />
</div>

<h1 align="center">VoxSentinel</h1>
### Identity-Secured Conversational Intelligence

![Architecture](https://img.shields.io/badge/architecture-Microservices-orange)
![Tech Stack](https://img.shields.io/badge/stack-React%20%7C%20FastAPI%20%7C%20PyTorch-blue)
![Realtime](https://img.shields.io/badge/latency-%3C50ms-success)
![Biometrics](https://img.shields.io/badge/security-Voice%20Print%20Auth-red)

> **"Bridging the gap between real-time signal processing and large language models."**

**VoxSentinel** is an enterprise-grade biometric security platform that authenticates users via unique vocal signatures while providing real-time, adaptive linguistic coaching. It was engineered to solve the challenge of **secure communication in untrusted environments**.

---

## 🏛️ System Modules

The architecture is decoupled into two high-performance microservices. Click below to explore the engineering deep-dives for each stack.

### [🖥️ Frontend Terminal (taalk-buddy)](./taalk-buddy/README.md)
*   **The Interface**: An edge-ready biometric terminal.
*   **Engineering Highlights**: `AudioWorklet` for non-blocking stream processing, `WebSockets` for binary transfer, and `OffscreenCanvas` for 60fps frequency visualization.
*   [**View Frontend Architecture →**](./taalk-buddy/README.md)

### [🧠 Neural Engine (backend2)](./backend2/README.md)
*   **The Brain**: A scalable inference cluster.
*   **Engineering Highlights**: Asynchronous Event Loop (`asyncio`), GPU-accelerated Speaker Verification (`Eagle`), and Retrieval-Augmented Generation (`RAG`) with Vector Memory.
*   [**View Backend Architecture →**](./backend2/README.md)

---

## ⚡ Core Capabilities

*   **🛡️ Zero-Trust Audio**: Every frame of audio is verified against a biometric enrollment vector before processing.
*   **🚀 Event-Driven**: Fully asynchronous pipeline handles multiple concurrent streams with negligible blocking.
*   **🧠 Context-Aware**: Integrates Vector Search (ChromaDB) to provide coaching based on long-term user history.
*   **☁️ Cloud-Native**: Containerized (Docker) and orchestration-ready (Compose) for scalable deployment.

---

## ⚡ Performance Constraints

VoxSentinel is engineered for **hard real-time** requirements in enterprise security.

| Metric | Measured Value | Target | Status |
| :--- | :--- | :--- | :--- |
| **Biometric Verification** | **12ms** / frame | < 30ms | 🟢 |
| **End-to-End Audio Latency** | **45ms** (Glass-to-Glass) | < 50ms | 🟢 |
| **LLM Time-to-First-Token** | **180ms** (Gemini Flash) | < 200ms | 🟢 |
| **False Rejection Rate (FRR)** | **1.2%** | < 2.0% | 🟢 |
| **UI Frame Rate** | **60 FPS** (Canvas API) | 60 FPS | 🟢 |
| **CPU Inference** | **Real-time** (Int8 Quantization) | < 50% Load | 🟢 |

---

## 🔁 System Data Flow

```mermaid
graph LR
    User([User Voice]) <==>|AudioWorklet| UI["Sentinel Client<br>(Frontend)"]
    UI <==>|Secure WebSocket| API["Biometric Engine<br>(Backend)"]
    API <==>|gRPC/REST| Cloud["Google Gemini<br>(LLM Cluster)"]

    style UI fill:#6366f1,stroke:#fff,stroke-width:2px
    style API fill:#10b981,stroke:#fff,stroke-width:2px
    style Cloud fill:#f43f5e,stroke:#fff,stroke-width:2px
    style User fill:#fff,stroke:#333,color:#000
```

---

*Engineered by **Varun B**.*
*📧 [Contact via Email](mailto:varub5725@gmail.com)*
