# AvertCare M1 — Phase 4–6 Final Execution & Model Report

## Phase 4: Leakage-Safe RAG Ablation & Model Comparison

**RAG Feature:** `rag_readmit_rate_k10` (from `data/processed/rag_features_safe.csv`)  
**Leakage-Safe Protocol:** Neighborhood rates computed strictly from training cohort encounters. Training queries excluded every encounter of the same patient. Validation and test patients were never in the index. Notes contain discharge-time fields only.

### Full 8-Configuration Model Comparison Matrix

| Model Architecture | Configuration | Val AUROC | Test AUROC | Test AUPRC | Test F1 | Test Precision | Test Recall | Opt Threshold |
|---|---|---|---|---|---|---|---|---|
| **Logistic Regression** | Tabular Only | 0.6686 | 0.6680 | 0.2330 | 0.2760 | 0.1912 | 49.65% | 0.52 |
| **Logistic Regression** | Tabular + RAG ($k=10$) | 0.6697 | 0.6675 | 0.2326 | 0.2758 | 0.1908 | 49.73% | 0.52 |
| **Random Forest** | Tabular Only | 0.6799 | 0.6724 | 0.2314 | 0.2856 | 0.1974 | 51.59% | 0.45 |
| **Random Forest** | Tabular + RAG ($k=10$) | 0.6790 | 0.6716 | 0.2302 | 0.2868 | 0.2123 | 44.17% | 0.47 |
| **FT-Transformer** | Tabular Only | 0.6695 | 0.6611 | 0.2173 | 0.2748 | 0.1879 | 51.15% | 0.14 |
| **FT-Transformer** | Tabular + Safe RAG ($k=10$) | 0.6744 | 0.6676 | 0.2265 | 0.2839 | 0.2084 | 44.52% | 0.13 |
| **XGBoost (Unweighted)** | Tabular Only | 0.6850 | 0.6809 | 0.2621 | 0.2868 | 0.2009 | 50.09% | 0.13 |
| 🏆 **XGBoost (CHAMPION)** | **Tabular + RAG ($k=10$)** | **0.6866** | **0.6804** | **0.2565** | **0.2905** | **0.1953** | **56.71%** | **0.12** |

**Champion Winner:** `XGBoost_d6_unweighted + RAG (k=10)`  
- **Validation AUROC:** `0.6866`  
- **Test AUROC:** `0.6804` (reported as **0.680**)  
- **Test AUPRC:** `0.2565`  
- **Test Recall (Sensitivity):** **`56.71%`** at decision threshold `0.12` (captures over half of all 30-day readmissions).  
- **Feature Count:** 147 features (146 OneHot tabular + 1 RAG feature `rag_readmit_rate_k10`).

---

## Phase 5: SHAP Explainability & SDoH Extraction

- Global SHAP summary bar plot: `ml_engine/shap_output/shap_summary_bar.png`
- Global SHAP beeswarm plot: `ml_engine/shap_output/shap_summary_beeswarm.png`
- Local explanation example: `ml_engine/shap_output/local_explanation_example.json`
- Top Risk Drivers: `number_inpatient`, `total_prior_visits`, `discharge_disposition_id_1`, `time_in_hospital`, and `rag_readmit_rate_k10`.
- Fast TreeSHAP computation executes in **<10ms** on CPU without GPU hardware requirements.

---

## Phase 6: Serialization & Backend Handoff

| Artifact | Location | Purpose |
|---|---|---|
| **Production Model** | `backend/models/best_model.joblib` | Calibrated XGBoost Depth-6 Classifier |
| **Feature Preprocessor** | `backend/models/preprocessor.joblib` | Fitted ColumnTransformer (StandardScaler + OneHotEncoder) |
| **RAG Vector Index** | `backend/models/rag_train_index.npz` | 384-d dense embeddings from Sentence-Transformer |
| **Feature Metadata** | `backend/models/feature_names.json` | Feature list & threshold contract (0.12) |
| **Test Verification** | `backend/models/sample_test_patient.json` | Deterministic verification sample |

---

## Production Inference Validation

- Result: **PASSED** (100% deterministic prediction match).
- Cold-start & low-memory resilience verified on Render/Docker (<512 MB RAM footprint).
