# Security Policy

## Biometric Data Handling

VoxSentinel treats voice biometric data as **Sensitive Personal Information (SPI)**. 

### 1. Data Minimization
*   We do NOT store raw audio recordings of user enrollment sessions on persistent disk in production environments.
*   Only the extracted feature vectors (float32 embeddings) are stored in the vector database.
*   These vectors are irreversible; original audio cannot be reconstructed from them.

### 2. Encryption
*   **In-Transit**: All WebSocket traffic (`wss://`) and API requests (`https://`) must be encrypted via TLS 1.3 in production.
*   **At-Rest**: The ChromaDB vector store should be deployed on encrypted storage volumes.

### 3. Reporting Vulnerabilities

We take security seriously. If you discover a vulnerability, please do **NOT** open a public issue.

**Please report sensitive issues to:**
varub5725@gmail.com

---

## Supported Versions

| Version | Supported |
| :--- | :--- |
| 1.0.x | ✅ |
| < 1.0 | ❌ |
