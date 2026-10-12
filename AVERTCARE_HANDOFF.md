# AvertCare — Engineering & Model Handoff Manifesto

> **Target Audience**: Incoming engineers, evaluators, and hackathon judges.  
> **Repository Ground Truth**: Current as of October 11, 2026 (`main` branch @ `8db80fd`).

---

## 🎯 1. Clinical Mission & Business Problem
* **Cognizant Hackathon Track**: Use Case #6 — Hospital Readmission Risk Prediction.
* **The Core Problem**: Under the CMS Hospital Readmissions Reduction Program (HRRP), hospitals lose up to 3% of total Medicare reimbursements when 30-day readmission rates exceed benchmarks. Diagnostic tools that merely output a risk percentage fail clinicians because they lack **actionable interventions**.
* **AvertCare Solution**: A **prescriptive** decision support system that predicts readmission risk, isolates patient-specific drivers via TreeSHAP, surfaces historical "twin patients", and generates an actionable 3-step discharge care plan powered by Google Gemini.
* **Clinical Dataset**: UCI Diabetes 130-US Hospitals (1999–2008). 101,766 inpatient encounters across 71,518 unique diabetic patients with ~50 structured clinical attributes.

---

## ⚖️ 2. Empirical Ground Truth & The "0.680 vs. 0.697" Distinction

### The 0.6971 Invalidation (Data Leakage Discovery)
* The initial Phase 4 exploration (`ml_engine/run_phase4_6_rag.py`) yielded a Random Forest + RAG AUROC of `0.6971`.
* **Root Cause Identified**: The synthetic clinical note generator accidentally embedded retrospective phrases referencing post-discharge readmission, and the vector index blended training and held-out test encounters. This produced an artificial correlation of $r \approx 0.85$ between the RAG feature and the binary outcome.
* **Action Taken**: `run_phase4_6_rag.py` was officially deprecated and modified to refuse execution.

### The Leakage-Safe Gold Standard (0.6804 AUROC)
* The pipeline was reconstructed in [`ml_engine/run_safe_ablation.py`](file:///c:/Drive%20D/cognizant/AvertCare/ml_engine/run_safe_ablation.py) using [`data/processed/rag_features_safe.csv`](file:///c:/Drive%20D/cognizant/AvertCare/data/processed/rag_features_safe.csv).
* Strict constraints enforced:
  1. Neighborhood statistics derived **strictly from training cohort encounters**.
  2. Queries excluded all encounters for the same individual (`patient_nbr` isolation).
  3. Clinical notes restricted to discharge-time observations only ($r \approx 0.04$ correlation).
* **The Winning Architecture**: `XGBoost_d6_unweighted` + RAG ($k=10$).
  * **Test AUROC**: `0.6804` (Consistently reported as **0.680**).
  * **Test AUPRC**: `0.2565`.
  * **Test Recall (Sensitivity)**: **`56.71%`** at decision threshold `0.12`.
* **Clinical Risk Calibration**:
  * **High Risk**: Risk score $\ge 0.20$ (Top ~9% of hospital discharges, precision $\approx 29\%$).
  * **Moderate Risk**: Risk score between $0.12$ and $0.20$.
  * **Low Risk**: Risk score $< 0.12$.

### Tabular Deep Learning: FT-Transformer (Safe Data)
* **Architecture**: Feature Tokenizer + 3-layer `TransformerEncoder` with 4 attention heads ($d=64$, $d_{ff}=128$).
* **Safe RAG Benchmark** ([`ml_engine/metrics/ft_transformer_safe_metrics.json`](file:///c:/Drive%20D/cognizant/AvertCare/ml_engine/metrics/ft_transformer_safe_metrics.json)):
  * **Tabular Only**: Test AUROC `0.6611`, Test AUPRC `0.2173`, Test Recall `51.15%` at threshold `0.14`.
  * **Tabular + Safe RAG ($k=10$)**: Test AUROC `0.6676`, Test AUPRC `0.2265`, Test Precision `20.84%` at threshold `0.13` ($\Delta\text{AUROC} = +0.0065$, $\Delta\text{AUPRC} = +0.0092$).
* **Artifacts**: Weights preserved in [`ml_engine/models/ft_transformer.pt`](file:///c:/Drive%20D/cognizant/AvertCare/ml_engine/models/ft_transformer.pt) and [`ml_engine/models/ft_rag.pt`](file:///c:/Drive%20D/cognizant/AvertCare/ml_engine/models/ft_rag.pt).
* *Note*: HistGradientBoosting has been completely removed from all pipelines and reports.

---

## 🧠 3. Subsystem Functionality & Boundaries

### A. RAG Retrieval Subsystem
* **Role**: Context retrieval, not risk prediction.
* **Mechanism**: On each request, [`backend/app/note_template.py`](file:///c:/Drive%20D/cognizant/AvertCare/backend/app/note_template.py) creates a clinical summary. This is embedded with `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions) and queried against the training cohort index in [`backend/models/rag_train_index.npz`](file:///c:/Drive%20D/cognizant/AvertCare/backend/models/rag_train_index.npz).
* **Outputs**:
  1. Appends `rag_readmit_rate_k10` as a continuous feature into the XGBoost scoring matrix.
  2. Returns the top 3 similar past diabetic cases with discharge dispositions and successful post-discharge interventions.

### B. Prescriptive Generative AI (Google Gemini)
* **Role**: Drafting clinical discharge steps, not calculating probabilities.
* **Model**: Google Gemini 2.0 Flash (`LIVE_LLM_ENABLED=true` in `backend/.env`).
* **Protocol**: Gemini ingests the patient risk score, relative risk ratio, top 3 SHAP drivers, SDoH flags, and twin cohort interventions to return up to 3 discharge steps and one clinical rationale sentence.
* **Deterministic Fallback**: If offline or unconfigured, defaults to rules (`plan_source = "rules"`). For instance, if HbA1c is unmeasured, Step 1 is strictly *"Order an HbA1c test before discharge."*

### C. Pattern-Based SDoH Extraction
* **Role**: Identifying social barriers that drive treatment non-adherence.
* **Mechanism**: [`backend/app/services.py`](file:///c:/Drive%20D/cognizant/AvertCare/backend/app/services.py) scans the clinical discharge note for 20+ clinical synonyms covering social isolation, financial distress/copay burden, lack of transportation, housing instability, and medication skipping.

---

## 🔌 4. API Specification & Interface Contracts

The API runs on FastAPI with interactive documentation at `http://localhost:8000/docs`.

### Protected Endpoints (Require Bearer Token)
1. `POST /api/predict`
   * **Inbound Payload**: Age, time in hospital, number of inpatient/emergency visits, medication count, HbA1c result, diabetes med, gender, discharge disposition, diagnosis group, and clinical note (minimum 10 characters).
   * **Outbound Response**:
     ```json
     {
       "risk_score": 0.384,
       "risk_category": "High Risk",
       "relative_risk_ratio": 3.37,
       "risk_percentile": 92,
       "shap_features": [
         {"feature": "num__number_inpatient", "impact": 0.142},
         {"feature": "num__total_prior_visits", "impact": 0.118}
       ],
       "sdoh_flags": ["Social isolation — lives alone", "Transportation barrier"],
       "care_plan": [
         "Schedule home health nurse visit within 48 hours.",
         "Coordinate medical transport for follow-up appointment.",
         "Enroll in 30-day post-discharge medication assistance program."
       ],
       "plan_source": "gemini",
       "clinical_rationale": "Risk is 3.37x hospital baseline (92th percentile). The strongest chart driver is number inpatient. The note also shows social isolation — lives alone.",
       "cms_penalty_saved_usd": 5913.60
     }
     ```
2. `POST /api/twin-patients`
   * Returns twin cohort readmission rate and up to 3 similar historical patients with their age, primary diagnosis, and effective home interventions.

---

## 🚢 5. Deployment Topology & Environments

| Component | Cloud Production Tier | Local MLOps Stack |
| :--- | :--- | :--- |
| **Frontend** | Vercel Edge (`https://avert-care.vercel.app`) | `http://localhost:3000` (Docker) |
| **Backend** | Render Web Service (`https://avertcare.onrender.com`) | `http://localhost:8000` (Docker) |
| **Vector DB** | Qdrant Cloud AWS Cluster (10,000 vectors) | Local `rag_train_index.npz` / Qdrant container |
| **Cache & Queue**| Render Internal Network | Redis 7 Alpine (`localhost:6379`) |
| **Observability** | Render Application Metrics | Prometheus (`:9090`) + Grafana (`:3001`) |
| **Registry** | Docker Hub: `ayushman25/avertcare-backend:latest` | Local image cache |

---

## 🚫 6. Hard Engineering Constraints (Do Not Violate)

1. **Never quote AUROC 0.6971**: That was the leaked experiment. Always report **0.6804 AUROC** on test.
2. **Never claim ClinicalBERT or Live FHIR Connection**: Notes are processed via pattern matching and MiniLM embeddings; FHIR is an architectural standard used for schema design.
3. **Never claim Gemini calculates numerical risk**: Risk is computed strictly by the scikit-learn / XGBoost pipeline. Gemini only drafts discharge text.
4. **Never commit `.env` files**: All secrets belong in GitHub Secrets, Vercel Environment Variables, or Render Service Settings.
