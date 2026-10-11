"""
AvertCare Backend · Database & Persistence Layer
Provides persistent storage backed by Redis (with Docker volume mounting)
and graceful in-memory fallback (mock_db) for local / offline execution.
"""

from __future__ import annotations

import json
import logging

import redis

from app.core.config import settings
from app.mock_db import (
    ANALYZED_PATIENTS as MOCK_ANALYZED_PATIENTS,
)
from app.mock_db import (
    PENDING_PATIENTS as MOCK_PENDING_PATIENTS,
)
from app.mock_db import (
    reset_mock_db,
)
from app.schemas import AnalyzedRecord, PatientProfile

logger = logging.getLogger("app.db")

REDIS_KEY_PENDING = "avertcare:patient:pending"
REDIS_KEY_ANALYZED_PREFIX = "avertcare:patient:analyzed:"
REDIS_KEY_ANALYZED_ZSET = "avertcare:analyzed_zset"

_redis_client: redis.Redis | None = None


def get_redis() -> redis.Redis | None:
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    try:
        client = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2.0,
            socket_timeout=2.0,
        )
        client.ping()
        _redis_client = client
        logger.info("[DB:REDIS] Connected to Redis at %s", settings.REDIS_URL)
        return _redis_client
    except Exception as exc:
        logger.warning(
            "[DB:REDIS] Redis unavailable at %s (%s). Operating in-memory mode.",
            settings.REDIS_URL,
            exc,
        )
        return None


def get_pending_patients() -> list[PatientProfile]:
    """Retrieve all pending patients. If Redis is available, caches/fetches from Redis."""
    r = get_redis()
    if r:
        try:
            cached = r.get(REDIS_KEY_PENDING)
            if cached:
                items = json.loads(cached)
                return [PatientProfile(**item) for item in items]
            # Seed pending patients into Redis
            items_json = json.dumps([p.model_dump() for p in MOCK_PENDING_PATIENTS])
            r.set(REDIS_KEY_PENDING, items_json)
        except Exception as exc:
            logger.warning("[DB:REDIS] Error reading pending patients: %s", exc)
    return list(MOCK_PENDING_PATIENTS)


def get_pending_patient_by_id(patient_id: str) -> PatientProfile | None:
    for p in get_pending_patients():
        if p.patient_id == patient_id:
            return p
    return None


def save_analyzed_patient(record: AnalyzedRecord) -> None:
    """Persists a genuine analyzed encounter to Redis and memory."""
    # 1. Update in-memory mock_db
    for idx, existing in enumerate(MOCK_ANALYZED_PATIENTS):
        if existing.patient_id == record.patient_id:
            MOCK_ANALYZED_PATIENTS[idx] = record
            break
    else:
        MOCK_ANALYZED_PATIENTS.append(record)

    # 2. Persist to Redis volume
    r = get_redis()
    if r:
        try:
            record_key = f"{REDIS_KEY_ANALYZED_PREFIX}{record.patient_id}"
            r.set(record_key, record.model_dump_json())
            # Store in sorted set scored by risk_score so highest risk is always first
            r.zadd(REDIS_KEY_ANALYZED_ZSET, {record.patient_id: float(record.risk_score)})
            logger.info(
                "[DB:REDIS:SAVED] Persisted patient=%s risk=%.3f to Redis",
                record.patient_id,
                record.risk_score,
            )
        except Exception as exc:
            logger.error("[DB:REDIS] Failed to persist analyzed record to Redis: %s", exc)


def get_analyzed_patients() -> list[AnalyzedRecord]:
    """Retrieve all analyzed records sorted by risk score descending."""
    r = get_redis()
    if r:
        try:
            # Get all patient IDs ordered by risk descending
            patient_ids = r.zrevrange(REDIS_KEY_ANALYZED_ZSET, 0, -1)
            if patient_ids:
                records: list[AnalyzedRecord] = []
                for pid in patient_ids:
                    raw = r.get(f"{REDIS_KEY_ANALYZED_PREFIX}{pid}")
                    if raw:
                        records.append(AnalyzedRecord.model_validate_json(raw))
                if records:
                    return records
        except Exception as exc:
            logger.warning("[DB:REDIS] Error reading analyzed patients from Redis: %s", exc)

    return sorted(MOCK_ANALYZED_PATIENTS, key=lambda x: x.risk_score, reverse=True)


def reset_db() -> None:
    """Reset analyzed patients in both Redis and memory."""
    reset_mock_db()
    r = get_redis()
    if r:
        try:
            keys = r.keys(f"{REDIS_KEY_ANALYZED_PREFIX}*")
            if keys:
                r.delete(*keys)
            r.delete(REDIS_KEY_ANALYZED_ZSET)
            r.delete(REDIS_KEY_PENDING)
            items_json = json.dumps([p.model_dump() for p in MOCK_PENDING_PATIENTS])
            r.set(REDIS_KEY_PENDING, items_json)
            logger.info("[DB:REDIS:RESET] Successfully reset Redis database state.")
        except Exception as exc:
            logger.warning("[DB:REDIS] Error during DB reset: %s", exc)
