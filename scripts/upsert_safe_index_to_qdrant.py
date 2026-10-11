#!/usr/bin/env python3
"""Copy the leakage-safe training index into Qdrant.

Reads the vectors already stored in backend/models/rag_train_index.npz and the
rows in rag_train_meta.csv. It does not re-embed, does not read
train_with_rag.csv, and does not add validation or test stays.

The API uses this collection for similar-patient search only when the point
count equals the npz row count. The discharge score keeps reading the npz file.

Usage, from the repo root, with Qdrant listening on localhost:6333:

    python scripts/upsert_safe_index_to_qdrant.py
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = ROOT / "backend" / "models" / "rag_train_index.npz"
META_PATH = ROOT / "backend" / "models" / "rag_train_meta.csv"
COLLECTION = "clinical_cases"
VECTOR_DIM = 384
BATCH = 256


def _load() -> tuple[np.ndarray, pd.DataFrame]:
    if not INDEX_PATH.exists() or not META_PATH.exists():
        raise SystemExit(f"Missing {INDEX_PATH.name} or {META_PATH.name}.")
    loaded = np.load(INDEX_PATH)
    embeddings = loaded["embeddings"].astype(np.float32)
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    embeddings = embeddings / np.clip(norms, 1e-8, None)
    meta = pd.read_csv(META_PATH)
    if len(meta) != len(embeddings):
        raise SystemExit(
            f"Index has {len(embeddings)} vectors and the metadata has {len(meta)} rows."
        )
    if embeddings.shape[1] != VECTOR_DIM:
        raise SystemExit(f"Expected {VECTOR_DIM}-d MiniLM vectors, found {embeddings.shape[1]}.")
    return embeddings, meta


def _payload(row: pd.Series) -> dict:
    interventions = row.get("interventions", "")
    if pd.isna(interventions):
        interventions = ""
    return {
        "encounter_id": int(row["encounter_id"]),
        "patient_id": int(row["patient_id"]),
        "age": float(row["age"]),
        "primary_diagnosis": str(row["primary_diagnosis"]),
        "readmitted_binary": int(row["readmitted_binary"]),
        "interventions": str(interventions),
    }


def run(qdrant_url: str, api_key: str) -> None:
    embeddings, meta = _load()
    client = QdrantClient(url=qdrant_url, api_key=api_key or None, timeout=60)
    if client.collection_exists(COLLECTION):
        client.delete_collection(COLLECTION)
    client.create_collection(
        collection_name=COLLECTION,
        vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
    )

    total = len(meta)
    for start in range(0, total, BATCH):
        stop = min(start + BATCH, total)
        points = [
            PointStruct(
                id=int(meta.iloc[i]["row_idx"]),
                vector=embeddings[i].tolist(),
                payload=_payload(meta.iloc[i]),
            )
            for i in range(start, stop)
        ]
        client.upsert(collection_name=COLLECTION, points=points)
        print(f"Upserted {stop}/{total}", flush=True)

    count = int(client.count(collection_name=COLLECTION, exact=True).count)
    if count != total:
        raise SystemExit(f"Qdrant has {count} points after upsert; the index has {total}.")
    print(f"Collection {COLLECTION} at {qdrant_url} has {count} training encounters.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Copy the safe training index into Qdrant.")
    parser.add_argument("--qdrant", default="http://localhost:6333")
    parser.add_argument("--api-key", default="")
    args = parser.parse_args()
    run(args.qdrant, args.api_key)


if __name__ == "__main__":
    main()
