# AvertCare: Complete Project Walkthrough & Operations Manual

> **Cognizant Hackathon (Use Case #6: Hospital Readmission Risk Prediction)**  
> AvertCare is a production-grade Prescriptive Clinical Decision Support System that predicts diabetic 30-day readmissions, visualizes TreeSHAP explanations, searches historical twin patients, and generates prescriptive discharge checklists powered by Google Gemini.

---

## 🏗️ 1. What We Have Built (The Full Stack)

### A. Machine Learning Engine (Leakage-Safe)
* **Dataset**: UCI Diabetes 130-US Hospitals (101,766 inpatient encounters across 10 years).
* **Patient-Level Split**: Strict 80/10/10 split ensuring zero patient overlap across training, validation, and test sets.
* **Winning Model**: **XGBoost Depth-6 (Unweighted)** with RAG feature augmentation.
  * **Test AUROC**: `0.6804` (reported as **0.680**).
  * **Test AUPRC**: `0.2565`.
  * **Test Recall (Sensitivity)**: **`56.71%`** at decision threshold `0.12`.
* **TreeSHAP Explainability**: Computes real-time marginal contributions for individual chart drivers (e.g., prior inpatient visits, length of stay, and admission velocity).

### B. Leakage-Safe RAG Engine (Historical Twin Retrieval)
* **Precomputed Vector Index**: 384-dimensional dense embeddings created via `sentence-transformers/all-MiniLM-L6-v2` stored in `backend/models/rag_train_index.npz`.
* **Zero Leakage**: Search space is strictly quarantined to training encounters. Notes contain only discharge-time observations (no post-discharge outcome text).
* **Output**: Surfaces the top-3 most clinically similar diabetic patients and appends `rag_readmit_rate_k10` into the feature matrix.

### C. Prescriptive Generative AI (Google Gemini)
* **Model**: Google Gemini 2.0 Flash.
* **Actionable Checklists**: Synthesizes a structured 3-step discharge care plan and clinical rationale from the risk score, top 3 SHAP drivers, twin interventions, and Social Determinants of Health (SDoH).
* **Deterministic Fallback**: If offline or unconfigured, falls back to a rules engine (`plan_source = "rules"`).

### D. Clinician Dashboard (Next.js 16)
* **Tech Stack**: Next.js 16, TypeScript, Tailwind CSS v4.
* **Epic EHR Aesthetic**: Dark-mode UI with low (green), moderate (amber), and high (red) risk indicators.
* **One-Click Presets**: Pre-configured demo scenarios (Quiet Home Discharge, Standard Sample Chart, and High-Utilization Skilled Nursing case).
* **Fail-Safe Access**: Quick Clinician Access bypass button ensures demo sessions never expire during judge evaluations.

### E. MLOps Observability Mesh
* **Docker Compose**: Orchestrates 6 microservices: Next.js, FastAPI, Qdrant, Redis, Prometheus, and Grafana.
* **Prometheus & Grafana**: Real-time monitoring of inference latency, request throughput, and error rates at `http://localhost:3001`.

---

## 🚀 2. Universal Setup (Run Locally in 2 Minutes)

All backend and frontend images are publicly pre-built and pinned to Docker Hub. No compilation required.

```bash
# 1. Clone the repository and navigate to root
git clone https://github.com/AYUS25/AvertCare.git
cd AvertCare

# 2. Configure environment files
cp backend/.env.example backend/.env
# (Optional: Add your GEMINI_API_KEY to backend/.env for live GenAI plans)

# 3. Pull pre-built images and launch the stack
docker compose pull
docker compose up -d

# 4. Access the services
# Clinician Dashboard : http://localhost:3000
# FastAPI Swagger Docs : http://localhost:8000/docs
# Grafana Observability: http://localhost:3001 (admin / avertcare)
# Prometheus Targets   : http://localhost:9090
```

---

## ☁️ 3. Cloud Production Verification (Live URLs)

For hackathon judges evaluating without running Docker locally:

| Service | Live Cloud URL | Hosting Provider |
| :--- | :--- | :--- |
| **Clinician Web App** | [https://avert-care.vercel.app](https://avert-care.vercel.app) | Vercel Edge Network |
| **FastAPI Backend API** | [https://avertcare.onrender.com](https://avertcare.onrender.com) | Render Web Service |
| **Interactive Docs** | [https://avertcare.onrender.com/docs](https://avertcare.onrender.com/docs) | Swagger UI |
| **Vector Database** | AWS Cloud Cluster (10,000 vectors) | Qdrant Cloud |

---

## ⚙️ 4. Feature Flags (in `backend/.env`)

| Variable | Default | Clinical / System Behavior |
| :--- | :---: | :--- |
| `LIVE_RAG_ENABLED` | `true` | Queries vector retrieval; falls back to deterministic mock if disabled |
| `LIVE_LLM_ENABLED` | `true` | Calls Gemini 2.0 Flash; uses rule-based clinical protocol if disabled |
| `GEMINI_API_KEY` | *(Set)* | Authenticates with Google AI Studio |
| `FIREBASE_PROJECT_ID` | `avertcare` | Enables JWT verification; leaving blank enables transparent dev mode |
| `QDRANT_URL` | *(Cluster)* | Cloud cluster endpoint for vector storage |
| `QDRANT_API_KEY` | *(Set)* | Cloud cluster access credentials |

---

## 📊 5. Verification Checklist

To verify that the system is functioning correctly:

1. **Authentication**: Open `http://localhost:3000` (or the Vercel URL). Click *"Quick Clinician Access (Never Expires)"* or log in with `doctor@avertcare.local` / `password123`.
2. **Preset Testing**: Click the *"High-Utilization Skilled Nursing"* preset. Observe that Age, Length of Stay, and Prior Inpatient Visits update automatically.
3. **Inference Execution**: Click **"Run AI Analysis"**.
   - Verify Risk Category renders as **High Risk** (Red indicator).
   - Check the **Relative Risk Badge**: e.g., `3.4x baseline risk (92th percentile)`.
   - Inspect the **Discharge Checklist**: Confirms 3 specific actions with a clinical rationale.
4. **Metrics Inspection**: Open Grafana at `http://localhost:3001`. Refresh to observe the request counter and inference latency spike on the dashboard.
