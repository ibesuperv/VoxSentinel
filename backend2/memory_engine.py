# memory_engine.py

import chromadb
import uuid
import datetime
from chromadb.utils import embedding_functions
from config import DATA_DIR, MAX_MEMORY_ITEMS


class MemorySystem:
    def __init__(self, reset=False):
        self.client = chromadb.PersistentClient(path=f"{DATA_DIR}/memory_db")

        self.embed_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )

        self.collection = self.client.get_or_create_collection(
            name="human_memory",
            embedding_function=self.embed_fn # type: ignore
        )

        if reset:
            self.reset()

    def reset(self):
        self.client.delete_collection("human_memory")
        self.collection = self.client.get_or_create_collection(
            name="human_memory",
            embedding_function=self.embed_fn # type: ignore
        )

    def store(self, text: str):
        if not text or len(text) > 500:
            return

        if self.collection.count() >= MAX_MEMORY_ITEMS:
            ids = self.collection.get()["ids"][:10]
            self.collection.delete(ids=ids)

        self.collection.add(
            documents=[text],
            ids=[str(uuid.uuid4())],
            metadatas=[{
                "timestamp": datetime.datetime.now().isoformat(),
                "confidence": 1
            }]
        )

    def retrieve(self, query: str, k: int = 5):
        results = self.collection.query(
            query_texts=[query],
            n_results=k
        )

        return results["documents"][0] if results["documents"] else []
