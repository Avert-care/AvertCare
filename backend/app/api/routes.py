"""
AvertCare Backend · API Routes

Paper-thin router — all logic delegated to services.py and db.py.
Auth dependency is a dev-bypass passthrough when FIREBASE_PROJECT_ID is unset.
"""

import logging
import time
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status

from app import db, services
from app.core.auth import require_auth
from app.schemas import (
    AnalyzedRecord,
    PatientEncounter,
    PatientProfile,
    PredictResponse,
    TwinPatientResponse,
)

logger = logging.getLogger("app.routes")
router = APIRouter(prefix="/api", tags=["Clinical AI"])


@router.get(
    "/patients/pending",
    response_model=list[PatientProfile],
    status_code=status.HTTP_200_OK,
    summary="Fetch pending ward census patients",
)
async def get_pending_patients(
    _token: dict = Depends(require_auth),
) -> list[PatientProfile]:
    """Returns synthetic diabetic patients currently awaiting discharge triage."""
    return db.get_pending_patients()


@router.get(
    "/patients/analyzed",
    response_model=list[AnalyzedRecord],
    status_code=status.HTTP_200_OK,
    summary="Fetch analyzed patients sorted by risk descending",
)
async def get_analyzed_patients(
    _token: dict = Depends(require_auth),
) -> list[AnalyzedRecord]:
    """Returns all triaged patients, sorted dynamically by risk_score in descending order."""
    return db.get_analyzed_patients()


@router.post(
    "/patients/reset",
    status_code=status.HTTP_200_OK,
    summary="Reset demo census queues",
)
async def reset_patients_census(
    _token: dict = Depends(require_auth),
) -> dict:
    """Restores the initial pending census and resets the analyzed queue in Redis and memory."""
    db.reset_db()
    pending = db.get_pending_patients()
    return {
        "status": "ok",
        "message": "Census queues reset to initial state.",
        "pending_count": len(pending),
    }


@router.get(
    "/patients/{patient_id}",
    response_model=PatientProfile,
    status_code=status.HTTP_200_OK,
    summary="Fetch single patient details for auto-fill",
)
async def get_patient_by_id(
    patient_id: str,
    _token: dict = Depends(require_auth),
) -> PatientProfile:
    """Fetches a single patient's 34-column data to auto-populate the Analyze screen."""
    p = db.get_pending_patient_by_id(patient_id)
    if p:
        return p

    for patient in db.get_analyzed_patients():
        if patient.patient_id == patient_id:
            return patient

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Patient '{patient_id}' not found in ward census.",
    )


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
        response = services.run_prediction(payload)

        # ── Save patient encounter, risk score & care plan into Redis & Analyzed queue ──
        pending_match = db.get_pending_patient_by_id(payload.patient_id)

        patient_name = getattr(payload, "patient_name", None) or (
            pending_match.patient_name if pending_match else f"Patient {payload.patient_id}"
        )
        discharge_time = getattr(payload, "discharge_time", None) or (
            pending_match.discharge_time if pending_match else "Today, 14:00"
        )
        planned_discharge_time = getattr(payload, "planned_discharge_time", None) or (
            pending_match.planned_discharge_time if pending_match else discharge_time
        )
        room_number = getattr(payload, "room_number", None) or (
            pending_match.room_number if pending_match else "Ward 3A"
        )

        record_payload = payload.model_dump()
        record_payload.update({
            "patient_name": patient_name,
            "discharge_time": discharge_time,
            "planned_discharge_time": planned_discharge_time,
            "room_number": room_number,
            "risk_score": response.risk_score,
            "risk_category": response.risk_category,
            "care_plan": response.care_plan,
            "shap_features": [sf.model_dump() for sf in response.shap_features],
            "sdoh_flags": response.sdoh_flags,
            "clinical_rationale": response.clinical_rationale,
            "plan_source": response.plan_source,
            "cms_penalty_saved_usd": response.cms_penalty_saved_usd,
            "relative_risk_ratio": response.relative_risk_ratio,
            "risk_percentile": response.risk_percentile,
            "analyzed_at": datetime.now(UTC).isoformat(),
        })
        analyzed_record = AnalyzedRecord(**record_payload)
        db.save_analyzed_patient(analyzed_record)

        elapsed_ms = (time.perf_counter() - t0) * 1000
        logger.info(
            "[API:PREDICT:SUCCESS] Patient=%s | Risk=%.2f%% (%s) | Duration=%.1fms",
            payload.patient_id,
            response.risk_score * 100,
            response.risk_category.value,
            elapsed_ms,
        )
        return response
    except Exception as exc:
        logger.exception(
            "[API:PREDICT:ERROR] Inference failure for Patient=%s",
            payload.patient_id,
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
            "[API:TWINS:ERROR] RAG retrieval failure for Patient=%s",
            payload.patient_id,
        )
        raise HTTPException(status_code=500, detail=f"RAG retrieval error: {exc}") from exc
