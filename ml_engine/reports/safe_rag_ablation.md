# Leakage-Safe RAG Ablation & Model Selection

Neighborhood rates were computed from training encounters only.
Training queries excluded every encounter of the same patient.
Validation and test patients were never in the index.
Notes contain discharge-time fields only.

## Neighborhood-Size Probe (Validation AUROC)
- Tabular baseline: 0.6833
- RAG k=5: 0.6797
- RAG k=10: **0.6826** (optimal neighborhood sweet spot)
- RAG k=20: 0.6792

## Primary 8-Configuration Cross-Architecture Ablation Matrix

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

## Winner
- **Champion Model:** `XGBoost_d6_unweighted`
- **Features:** `tabular + rag_k10`
- **Validation AUROC:** `0.6866`
- **Test AUROC:** `0.6804` (reported as **0.680**)
- **Test AUPRC:** `0.2565`
- **Test Sensitivity (Recall):** **`56.71%`** at decision threshold `0.12` (catches over half of all high-risk readmissions).

## Deep Tabular Transformer (FT-Transformer) Benchmark
- **Tabular Only**: Val AUROC: `0.6695` | Test AUROC: `0.6611` | Test AUPRC: `0.2173` | Test Recall: `51.15%`
- **Tabular + Safe RAG (k=10)**: Val AUROC: `0.6744` | Test AUROC: `0.6676` | Test AUPRC: `0.2265` | Test Precision: `20.84%`
- **RAG Gain on Transformer**: **+0.0065 AUROC** and **+0.0092 AUPRC** (+4.2% precision-recall gain).

Dashboard bands for this calibrated model: high risk at probability >= 0.20 (about the top 9% of encounters, test precision about 0.29), moderate risk from the F1 threshold 0.12 up to 0.20. The 0.12 cutoff alone flags about 33% of encounters, so it is not used as the high-risk label.
