"""
AvertCare Backend · API Routes

Paper-thin router — all logic delegated to services.py.
Auth dependency is a dev-bypass passthrough when FIREBASE_PROJECT_ID is unset.
"""

import logging
import time

from fastapi import APIRouter, Depends, HTTPException, status

from app import services
from app.core.auth import require_auth
from app.schemas import PatientEncounter, PredictResponse, TwinPatientResponse

logger = logging.getLogger("app.routes")
router = APIRouter(prefix="/api", tags=["Clinical AI"])


@router.post(
    "/predict",
    response_model=PredictResponse,
    status_code=status.HTTP_200_OK,
    summary="Hybrid readmission risk prediction",
)
async def predict_readmission(
    payload: PatientEncounter,
    _token: dict = Depends(require_auth),
) -> PredictResponse:
    t0 = time.perf_counter()
    user_id = _token.get("uid", "unknown")
    logger.info(
        "[API:PREDICT:START] User=%s | Patient=%s | Age=%d | Diagnosis='%s'",
        user_id,
        payload.patient_id,
        payload.age,
        payload.primary_diagnosis,
    )
    try:
        resp = services.run_prediction(payload)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        logger.info(
            "[API:PREDICT:SUCCESS] Patient=%s | Risk=%.2f%% (%s) | Duration=%.1fms",
            payload.patient_id,
            resp.risk_score * 100,
            resp.risk_category.value,
            elapsed_ms,
        )
        return resp
    except Exception as exc:
        logger.exception(
            "[API:PREDICT:ERROR] Inference failure for Patient=%s: %s",
            payload.patient_id,
            exc,
        )
        raise HTTPException(status_code=500, detail=f"Inference error: {exc}") from exc


@router.post(
    "/twin-patients",
    response_model=TwinPatientResponse,
    status_code=status.HTTP_200_OK,
    summary="RAG twin-patient retrieval",
)
async def retrieve_twin_patients(
    payload: PatientEncounter,
    _token: dict = Depends(require_auth),
) -> TwinPatientResponse:
    t0 = time.perf_counter()
    user_id = _token.get("uid", "unknown")
    logger.info(
        "[API:TWINS:START] User=%s | Patient=%s | Diagnosis='%s'",
        user_id,
        payload.patient_id,
        payload.primary_diagnosis,
    )
    try:
        resp = services.run_rag_retrieval(payload)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        logger.info(
            "[API:TWINS:SUCCESS] Patient=%s | Twins=%d | Rate=%.2f%% | Duration=%.1fms",
            payload.patient_id,
            len(resp.twins),
            resp.rag_readmission_rate * 100,
            elapsed_ms,
        )
        return resp
    except Exception as exc:
        logger.exception(
            "[API:TWINS:ERROR] RAG retrieval failure for Patient=%s: %s",
            payload.patient_id,
            exc,
        )
        raise HTTPException(status_code=500, detail=f"RAG retrieval error: {exc}") from exc
