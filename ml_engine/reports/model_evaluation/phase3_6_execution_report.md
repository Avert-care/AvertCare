# AvertCare ML Engine — Phase 3 to Phase 6 Final Execution Report

## 1. Executive Summary
This report documents the end-to-end execution, evaluation, and serialization of Phases 3–6 of the AvertCare Hospital Readmission Risk Prediction system.

---

## 2. Phase 3 & 4: Model Performance Comparison

| Model | Configuration | Val AUROC | Val AUPRC | Test AUROC | Test AUPRC | Test F1 (Opt) | Opt Thresh |
|-------|---------------|-----------|-----------|------------|------------|---------------|------------|
| **Logistic Regression** | Tabular Only | 0.6686 | 0.2189 | 0.6680 | 0.2330 | 0.2760 | 0.52 |
| **Logistic Regression** | Tabular + RAG | 0.6697 | 0.2201 | 0.6675 | 0.2326 | 0.2758 | 0.52 |
| **Random Forest** | Tabular Only | 0.6799 | 0.2245 | 0.6724 | 0.2314 | 0.2856 | 0.45 |
| **Random Forest** | Tabular + RAG | 0.6790 | 0.2246 | 0.6716 | 0.2302 | 0.2868 | 0.47 |
| **FT-Transformer** | Tabular Only | 0.6695 | 0.2197 | 0.6611 | 0.2173 | 0.2748 | 0.14 |
| **FT-Transformer** | Tabular + RAG | 0.6744 | 0.2279 | 0.6676 | 0.2265 | 0.2839 | 0.13 |
| **XGBoost** | Tabular Only | 0.6850 | 0.2384 | 0.6809 | 0.2621 | 0.2868 | 0.13 |
| **XGBoost (CHAMPION)** | Tabular + RAG | **0.6866** | **0.2388** | **0.6804** | **0.2565** | **0.2905** | **0.12** |

---

## 3. Phase 4: Safe RAG Integration Architecture
- **Status:** Evaluated across 8 configurations under strict data-leakage prevention (patient-split separation, k=10 neighborhood).
- **Supported Fusion:** Feature Concatenation (Early Fusion) and Probability Blending (Late Fusion).
- **Tabular Vector Dim:** 144 dimensions.
- **RAG Feature:** `rag_readmit_rate_k10` (145 total dimensions).
- **Production Champion:** XGBoost with safe RAG feature (`Test AUROC: 0.6804`, `Test AUPRC: 0.2565`, `Recall: 56.71%`).

---

## 4. Phase 5: SHAP Explainability
- Global SHAP summary bar plot and beeswarm plot saved to `ml_engine/shap_output/`.
- Individual patient risk factor attributions extracted.

---

## 5. Phase 6: Production Inference API
Sample Patient Inference Output:
```json
{
  "readmission_risk_probability": 0.6227,
  "readmission_predicted": 1,
  "risk_band": "HIGH",
  "risk_label": "High Risk",
  "color_code": "#EF4444",
  "top_risk_drivers": [
    {
      "feature": "num__number_inpatient",
      "value": 1.921422449261735,
      "importance": 0.15026146606596197,
      "contribution": 0.28871575415811973
    },
    {
      "feature": "num__total_prior_visits",
      "value": 1.2342041726001076,
      "importance": 0.1219203819921314,
      "contribution": 0.1504746441796876
    },
    {
      "feature": "cat__discharge_disposition_id_1",
      "value": 1.0,
      "importance": 0.05339871431122294,
      "contribution": 0.05339871431122294
    },
    {
      "feature": "num__time_in_hospital",
      "value": 1.2233468786159154,
      "importance": 0.03872917976134384,
      "contribution": 0.04737922117239467
    },
    {
      "feature": "num__num_lab_procedures",
      "value": 0.9731448848835701,
      "importance": 0.04306765810296645,
      "contribution": 0.04191107118681624
    }
  ]
}
```
