"""
AvertCare Backend · Test Suite

Auth dependency is overridden via FastAPI dependency_overrides so tests
never require a live Firebase project or real JWT token.
"""

from fastapi.testclient import TestClient

from app.core.auth import require_auth
from app.main import create_app
from app.services import _plain_base_score


# ── Auth stub — injected for all tests ──────────────────────────────────────
def _mock_auth():
    return {"uid": "test-clinician", "email": "test@avertcare.local"}


def _make_client() -> TestClient:
    app = create_app()
    app.dependency_overrides[require_auth] = _mock_auth
    return TestClient(app)


client = _make_client()

# ── Shared fixture payload ───────────────────────────────────────────────────
SAMPLE_PAYLOAD = {
    "patient_id": "TEST-001",
    "age": 67,
    "primary_diagnosis": "Type 2 Diabetes with complications",
    "time_in_hospital": 7,
    "num_prior_admissions": 2,
    "num_medications": 8,
    "clinical_note": (
        "Patient lives alone and has expressed concerns about inability to afford insulin. "
        "Polypharmacy noted. Discharge planned for tomorrow."
    ),
}


# ─────────────────────────────────────────────────────────────
class TestHealthProbes:
    def test_health_returns_200(self):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


# ─────────────────────────────────────────────────────────────
class TestPredictEndpoint:
    def test_returns_200_with_valid_payload(self):
        r = client.post("/api/predict", json=SAMPLE_PAYLOAD)
        assert r.status_code == 200

    def test_risk_score_in_range(self):
        r = client.post("/api/predict", json=SAMPLE_PAYLOAD)
        data = r.json()
        assert 0.0 <= data["risk_score"] <= 1.0

    def test_shap_features_is_list(self):
        r = client.post("/api/predict", json=SAMPLE_PAYLOAD)
        # shap_features is a list — may be empty if model artifacts not mounted in CI
        assert isinstance(r.json()["shap_features"], list)

    def test_sdoh_flags_extracted(self):
        r = client.post("/api/predict", json=SAMPLE_PAYLOAD)
        flags = r.json()["sdoh_flags"]
        # "lives alone" and "cannot afford" are in the note
        assert any("alone" in f.lower() or "financial" in f.lower() for f in flags)

    def test_care_plan_present(self):
        r = client.post("/api/predict", json=SAMPLE_PAYLOAD)
        body = r.json()
        assert 1 <= len(body["care_plan"]) <= 3
        assert body["plan_source"] in {"rules", "gemini"}
        assert isinstance(body["clinical_rationale"], str) and body["clinical_rationale"]

    def test_short_note_returns_422(self):
        payload = {**SAMPLE_PAYLOAD, "clinical_note": "too short"}
        r = client.post("/api/predict", json=payload)
        assert r.status_code == 422

    def test_invalid_payload_returns_422(self):
        r = client.post("/api/predict", json={"age": -1})  # missing required fields
        assert r.status_code == 422


# ─────────────────────────────────────────────────────────────
class TestTwinPatientEndpoint:
    def test_returns_200_with_valid_payload(self):
        r = client.post("/api/twin-patients", json=SAMPLE_PAYLOAD)
        assert r.status_code == 200

    def test_returns_correct_twin_count(self):
        r = client.post("/api/twin-patients", json=SAMPLE_PAYLOAD)
        assert len(r.json()["twins"]) == 3

    def test_rag_rate_in_range(self):
        r = client.post("/api/twin-patients", json=SAMPLE_PAYLOAD)
        rate = r.json()["rag_readmission_rate"]
        assert 0.0 <= rate <= 1.0

    def test_diagnosis_group_present(self):
        r = client.post("/api/twin-patients", json=SAMPLE_PAYLOAD)
        assert r.json()["twins"][0]["diagnosis_group"]


class TestXgbBaseScore:
    def test_strips_list_wrapping_so_shap_can_parse_it(self):
        assert _plain_base_score("[1.1387802E-1]") == float("1.1387802E-1")


# ─────────────────────────────────────────────────────────────
class TestWardCensusEndpoints:
    def test_get_pending_patients_returns_200(self):
        r = client.get("/api/patients/pending")
        assert r.status_code == 200
        patients = r.json()
        assert len(patients) >= 5
        assert "patient_id" in patients[0]
        assert "patient_name" in patients[0]
        assert "discharge_time" in patients[0]

    def test_get_patient_by_id_returns_200(self):
        # Fetch first pending patient ID
        pending = client.get("/api/patients/pending").json()
        first_id = pending[0]["patient_id"]
        r = client.get(f"/api/patients/{first_id}")
        assert r.status_code == 200
        assert r.json()["patient_id"] == first_id
        assert r.json()["patient_name"] == pending[0]["patient_name"]

    def test_get_patient_by_id_404_on_unknown(self):
        r = client.get("/api/patients/UNKNOWN-999")
        assert r.status_code == 404

    def test_predict_and_analyzed_queue(self):
        # Initial analyzed count
        initial_analyzed = client.get("/api/patients/analyzed").json()

        # Run prediction on a pending patient
        pending = client.get("/api/patients/pending").json()
        target = pending[0]
        r_pred = client.post("/api/predict", json=target)
        assert r_pred.status_code == 200
        pred_data = r_pred.json()
        assert "risk_score" in pred_data
        assert "risk_category" in pred_data

        # Check analyzed queue
        r_analyzed = client.get("/api/patients/analyzed")
        assert r_analyzed.status_code == 200
        analyzed_list = r_analyzed.json()
        assert len(analyzed_list) >= len(initial_analyzed)

        # Check sorting by risk_score descending
        scores = [item["risk_score"] for item in analyzed_list]
        assert scores == sorted(scores, reverse=True)

