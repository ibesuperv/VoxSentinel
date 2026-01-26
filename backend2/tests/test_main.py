import sys
from unittest.mock import MagicMock

# Mock heavy engines BEFORE importing main
sys.modules["transcription"] = MagicMock()
sys.modules["eagle_engine"] = MagicMock()
sys.modules["llm_engine"] = MagicMock()
sys.modules["dill"] = MagicMock() # Often a hidden dep

from fastapi.testclient import TestClient
# Now import main, which will use the mocks
from main import app 

client = TestClient(app)

def test_read_main():
    """Test the root endpoint for health check."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "TalkBuddy Backend Running"}

def test_enroll_voice_invalid_file():
    """Test enrollment with invalid file type."""
    files = {'audio': ('test.txt', b'fake content', 'text/plain')}
    response = client.post(
        "/api/enroll-voice",
        data={"name": "Test User"},
        files=files
    )
    # The API checks for .wav ending manually
    assert response.status_code == 400
    assert "WAV required" in response.json()["detail"]

