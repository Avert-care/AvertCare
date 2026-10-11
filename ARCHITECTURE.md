# AvertCare — Production Architecture & Engineering Reference

> **Executive Overview**  
> AvertCare is a production-grade, loosely coupled **Prescriptive Clinical Decision Support System (CDSS)** designed for diabetic discharge management. Unlike black-box diagnostic models that only output a risk percentage, AvertCare predicts 30-day readmission risk, isolates individual patient drivers via TreeSHAP, surfaces historical "twin patient" cohorts, and synthesizes an actionable, 3-step discharge care plan powered by Google Gemini.

---

## 🧭 1. High-Level System Architecture

AvertCare operates across a dual topology: a **Cloud Production Tier** (for zero-install judge access) and a **Local Containerized Stack** (for full offline MLOps observability).

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    PRESENTATION TIER                                        │
│                                                                                             │
│  [Cloud] Vercel Edge: https://avert-care.vercel.app                                         │
│  [Local] Docker Desktop: http://localhost:3000                                              │
│                                                                                             │
│  Next.js 16 (App Router) • TypeScript • Tailwind CSS v4 • Epic EHR Dark-Mode Aesthetic     │
│  Authentication: Firebase Auth (Client SDK) + Persistent Clinician Demo Bypass              │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │ HTTPS / Bearer Token
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   APPLICATION & INFERENCE TIER                              │
│                                                                                             │
│  [Cloud] Render Web Service: https://avertcare.onrender.com                                 │
│  [Local] Docker Container: avertcare-backend (Port 8000)                                    │
│                                                                                             │
│  FastAPI (Uvicorn) • Pydantic v2 • Prometheus Instrumentator                                │
│                                                                                             │
│  ┌─────────────────────────┐  ┌───────────────────────────┐  ┌───────────────────────────┐  │
│  │     Authentication      │  │     Clinical Scoring      │  │    Prescriptive GenAI     │  │
│  │   Firebase Admin SDK    │  │   XGBoost Depth-6 Model   │  │   Gemini 2.0 Flash /      │  │
│  │  JWT Token Verification │  │   TreeSHAP Attributions   │  │   Rule-Based Fallback     │  │
│  └─────────────────────────┘  └───────────────────────────┘  └───────────────────────────┘  │
└──────────────┬───────────────────────────────┬───────────────────────────────┬──────────────┘
               │                               │                               │
               ▼                               ▼                               ▼
┌──────────────────────────────┐┌──────────────────────────────┐┌──────────────────────────────┐
│       VECTOR RETRIEVAL       ││      IN-MEMORY CACHE         ││        OBSERVABILITY         │
│                              ││                              ││                              │
│ [Primary] Local NumPy Index  ││ Redis 7 Alpine (Port 6379)   ││ Prometheus (Port 9090)       │
│  MiniLM Embeddings (384-dim) ││  • Twin Query Result Cache   ││  • fastapi_requests_total    │
│  rag_train_index.npz         ││  • Gemini Quota Rate Limiter ││  • inference_duration_seconds│
│                              ││  • Distributed Session Store ││ Grafana (Port 3001)          │
│ [Cloud] Qdrant Cloud Cluster ││                              ││  • P95/P99 Latency & RPS     │
│  10,000 Patient Vectors      ││                              ││  • Error Rate Monitoring     │
└──────────────────────────────┘└──────────────────────────────┘└──────────────────────────────┘
```

---

## 🔄 2. End-to-End Clinical Data Flow

Every clinical review progresses through an orchestrated, 7-stage pipeline:

```
1. CLINICIAN INPUT
   Clinician loads a diabetic discharge chart on Next.js UI (or selects a pre-configured preset).
   Chart contains: Demographics, stay length, diagnostic ICD-9 groups, HbA1c status, meds, and discharge note.
         │
         ▼
2. SECURITY & AUTHENTICATION
   Client attaches Firebase Auth JWT (or dev-clinician-token) via Authorization: Bearer <token>.
   Backend validates token via Firebase Admin SDK in backend/app/core/auth.py.
         │
         ▼
3. TWIN ENCOUNTER RETRIEVAL (Leakage-Safe RAG)
   backend/app/note_template.py generates a clinical observation summary from discharge-time variables.
   backend/app/services.py embeds text via sentence-transformers/all-MiniLM-L6-v2 (384-dim).
   Vector index queries training encounters only (rag_train_index.npz), calculating:
   → rag_readmit_rate_k10 (historical readmission rate of the 10 most similar diabetic twins).
         │
         ▼
4. PREPROCESSING & FEATURE PIPELINE
   Structured chart + rag_readmit_rate are passed through preprocessor.joblib (ColumnTransformer):
   - Numerical: Imputed with median and scaled via StandardScaler.
   - Categorical: One-Hot Encoded with handle_unknown='ignore'.
   - Result: Dense 147-dimensional clinical feature vector.
         │
         ▼
5. MACHINE LEARNING INFERENCE
   best_model.joblib (XGBoost Depth-6 Unweighted) calculates calibrated readmission probability.
   - High Risk: Probability >= 0.20 (Top ~9% of hospital discharges, precision ~29%).
   - Moderate Risk: Probability between 0.12 and 0.20.
   - Low Risk: Probability < 0.12.
   - Relative Risk Ratio: Calculated relative to hospital baseline (11.4%).
         │
         ▼
6. EXPLAINABILITY & SOCIAL DETERMINANTS (SDoH)
   - TreeSHAP computes exact marginal feature attributions for top clinical drivers.
   - Pattern-based SDoH extraction scans clinical note for social isolation, transportation,
     housing instability, and medication copay distress.
         │
         ▼
7. PRESCRIPTIVE CARE PLAN GENERATION
   - If LIVE_LLM_ENABLED=true: Prompt containing risk score, top 3 SHAP drivers, twin interventions,
     and SDoH flags is sent to Google Gemini 2.0 Flash. Gemini returns a tailored 3-step action plan.
   - Fallback: Deterministic rule engine triggers specific clinical protocols (e.g., ordering HbA1c if unmeasured).
   - Result returned to Next.js dashboard as PredictResponse JSON.
```

---

## 📦 3. Repository Structure & Directory Roles

```
AvertCare/
├── .github/workflows/deploy.yml   # Automated GitHub Actions CI/CD (Ruff, Pytest, Vercel, Render)
├── docker-compose.yml             # Local 6-service orchestration mesh (pinned to Docker Hub)
├── ARCHITECTURE.md                # System engineering specification (this file)
├── WALKTHROUGH.md                 # Deployment & operations guide
├── AVERTCARE_HANDOFF.md           # Model provenance, ground truth, and constraints
│
├── backend/                       # FastAPI Clinical Scoring Microservice
│   ├── Dockerfile                 # Multi-stage production container
│   ├── requirements.txt           # Pinned backend dependencies
│   ├── app/
│   │   ├── main.py                # FastAPI factory, CORS, inference logging & metrics
│   │   ├── schemas.py             # Pydantic v2 data models (PredictResponse, PatientEncounter)
│   │   ├── services.py            # Inference engine, TreeSHAP, RAG retrieval & Gemini logic
│   │   ├── note_template.py       # Clinical note synthesizer for twin matching
│   │   ├── api/routes.py          # HTTP routing (/api/predict, /api/twin-patients)
│   │   └── core/
│   │       ├── auth.py            # Firebase JWT & persistent clinician token validator
│   │       └── config.py          # Environment settings (Pydantic BaseSettings)
│   ├── models/                    # Serialized production ML artifacts
│   │   ├── best_model.joblib      # Winning XGBoost depth-6 classifier
│   │   ├── preprocessor.joblib    # Fitted ColumnTransformer (OneHot + Scaler)
│   │   ├── rag_train_index.npz    # 384-dim precomputed embeddings for training cohort
│   │   ├── rag_train_meta.csv     # Metadata associated with vector index
│   │   └── feature_names.json     # Feature list and metadata specification
│   └── tests/                     # Automated pytest suite (13 unit/integration tests)
│
├── frontend/                      # Clinician-Facing Web Application
│   ├── Dockerfile                 # Standalone Next.js multi-stage Docker build
│   ├── next.config.ts             # Output standalone configuration
│   └── src/
│       ├── app/
│       │   ├── page.tsx           # Epic EHR-style discharge dashboard
│       │   └── globals.css        # Tailwind CSS v4 design tokens
│       ├── components/
│       │   └── LoginModal.tsx     # Clinician authentication modal with quick-access bypass
│       └── contexts/
│           └── AuthContext.tsx    # Firebase Auth provider & localStorage session store
│
├── ml_engine/                     # Offline Data Science & Model Training Lab (Not used at request time)
│   ├── clean.py                   # Data cleaning and feature engineering
│   ├── split.py                   # Patient-level 80/10/10 split logic
│   ├── run_safe_ablation.py       # Leakage-safe ablation study runner
│   ├── evaluate.py                # Metrics calculation (AUROC, AUPRC, F1, Brier score)
│   ├── ft_transformer.py          # PyTorch Tabular Transformer architecture
│   ├── metrics/                   # Raw JSON metrics output from training pipelines
│   └── reports/                   # Markdown evaluation reports and ROC/PR plots
│
├── scripts/                       # Database and Vector Seeding Scripts
│   ├── build_leakage_safe_rag.py  # Builds the safe training vector index
│   ├── fast_seed_qdrant.py        # High-speed streaming seeder for Qdrant (batch size 2500)
│   └── seed_rag_engine.py         # Qdrant Cloud / Local seeder
│
└── grafana/                       # Observability & Metrics Dashboard Provisioning
    └── provisioning/              # Auto-provisioning datasources and AvertCare IT Ops dashboards
```

---

## 🤖 4. Model Architecture & Empirical Ground Truth

### Official Performance Matrix (Held-out Test Cohort: $N = 10,177$)

| Architecture | Feature Set | Test AUROC | Test AUPRC | Test F1 | Test Precision | Test Recall | Decision Thresh |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Logistic Regression** | Tabular Only | `0.6680` | `0.2331` | `0.2765` | `19.15%` | `49.73%` | `0.52` |
| **Random Forest** | Tabular Only | `0.6725` | `0.2324` | `0.2801` | `20.38%` | `44.79%` | `0.53` |
| **FT-Transformer** | Tabular Only | `0.6733` | `0.2438` | `0.2785` | `20.09%` | `45.41%` | `0.15` |
| **XGBoost (Unweighted)** | Tabular Only | `0.6809` | `0.2621` | `0.2868` | `20.09%` | `50.09%` | `0.13` |
| **XGBoost (Production)** | **Tabular + RAG ($k=10$)** | **`0.6804`** | **`0.2565`** | **`0.2905`** | **`19.53%`** | **`56.71%`** | **`0.12`** |

### The Scientific Defense of 0.680 AUROC:
* **The 0.697 Trap**: An earlier prototype script (`run_phase4_6_rag.py`) included retrospective text in synthetic notes that leaked readmission labels, inflating the correlation ($r \approx 0.85$).
* **The Leakage-Safe Remedy**: `run_safe_ablation.py` quarantined all search vectors strictly to training patients, dropped post-discharge language, and enforced patient-level splitting. The true, reproducible clinical performance is **0.680 AUROC**, prioritizing high sensitivity (**56.7% Recall**) to prevent missed clinical deterioration.

---

## ⚡ 5. Redis Infrastructure Role

Redis is deployed as an in-memory caching and rate-limiting backbone (`avertcare-redis` on port `6379`):

1. **Twin-Encounter Caching**: Caches cosine-similarity lookups and SHAP calculations for identical patient charts, reducing repeat inference latency to `<2ms`.
2. **LLM Quota Protection**: Acts as a distributed token-bucket rate limiter to protect the Google Gemini API key from rate limits and high costs during burst traffic.
3. **Session Store**: Supports stateless horizontal scaling of the FastAPI backend across multiple container replicas.

---

## 🚀 6. CI/CD & Cloud Deployment Pipeline

AvertCare uses automated continuous deployment triggered on every push to `main`:

```
Git Push to main
       │
       ▼
GitHub Actions (deploy.yml)
       ├─ Linting & Style: Ruff v0.17.0
       ├─ Security Audit: Bandit
       ├─ Automated Testing: Pytest (13 unit & API contract tests)
       ├─ Docker Hub Publish: Builds & pushes public tagged images:
       │    • ayushman25/avertcare-backend:latest
       │    • ayushman25/avertcare-frontend:latest
       ├─ Vercel Deployment: Deploys Next.js dashboard via Vercel CLI 22
       └─ Render Trigger: POST to RENDER_DEPLOY_HOOK_URL rebuilding FastAPI
```
