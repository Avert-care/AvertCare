"""
AvertCare ML Engine — Leakage-Safe FT-Transformer Training & Ablation
Trains Feature Tokenizer + Transformer (FT-Transformer) on:
  1. Tabular Only (12 numerical + 22 categorical)
  2. Tabular + Safe RAG (13 numerical including rag_readmit_rate_k10 + 22 categorical)

Uses safe data: data/processed/rag_features_safe.csv
"""

import json
import os
import sys

import joblib
import numpy as np
import pandas as pd
import torch
from sklearn.model_selection import StratifiedShuffleSplit
from sklearn.preprocessing import StandardScaler

# Ensure ml_engine directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from evaluate import compute_metrics, find_optimal_threshold
from ft_transformer import FTTransformerClassifier

DATA_DIR = "ml_engine/data/processed"
SAFE_RAG_CSV = "data/processed/rag_features_safe.csv"
MODELS_DIR = "ml_engine/models"
METRICS_DIR = "ml_engine/metrics"
REPORTS_DIR = "ml_engine/reports"

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(METRICS_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)


def load_data_and_features():
    print("=" * 70)
    print("LOADING SPLITS & SAFE RAG FEATURES FOR FT-TRANSFORMER")
    print("=" * 70)

    train_df = pd.read_csv(os.path.join(DATA_DIR, "train_with_ids.csv"))
    val_df   = pd.read_csv(os.path.join(DATA_DIR, "val_with_ids.csv"))
    test_df  = pd.read_csv(os.path.join(DATA_DIR, "test_with_ids.csv"))

    rag_df = pd.read_csv(SAFE_RAG_CSV)[["encounter_id", "rag_readmit_rate_k10"]]

    frames = {}
    for name, df in [("train", train_df), ("val", val_df), ("test", test_df)]:
        merged = df.merge(rag_df, on="encounter_id", how="left")
        if merged["rag_readmit_rate_k10"].isna().any():
            missing = int(merged["rag_readmit_rate_k10"].isna().sum())
            raise ValueError(f"Split {name} has {missing} missing safe RAG features.")
        corr = merged["rag_readmit_rate_k10"].corr(merged["readmitted_binary"])
        print(f"  {name:5s}: rows={len(merged):6d} | corr(k10, target)={corr:.4f}")
        frames[name] = merged

    pre_ft = joblib.load(os.path.join(DATA_DIR, "preprocessor_ft.joblib"))
    print("\nTransforming with preprocessor_ft.joblib (Ordinal + Scaler)...")
    X_train_base = pre_ft.transform(frames["train"])
    X_val_base   = pre_ft.transform(frames["val"])
    X_test_base  = pre_ft.transform(frames["test"])

    y_train = frames["train"]["readmitted_binary"].values
    y_val   = frames["val"]["readmitted_binary"].values
    y_test  = frames["test"]["readmitted_binary"].values

    # Preprocessor output: cols 0..11 are numerical (12), cols 12..33 are categorical (22)
    # Compute cardinalities across all splits (+1 for unknown category shift)
    X_all = np.vstack([X_train_base, X_val_base, X_test_base])
    X_cat_all = np.maximum(0, X_all[:, 12:].astype(int) + 1)
    cat_cardinalities = [int(X_cat_all[:, i].max() + 1) for i in range(22)]
    print(f"Categorical cardinalities (22 features): {cat_cardinalities}")

    # Scale the safe RAG feature strictly fitted on training split
    rag_scaler = StandardScaler()
    rag_train = rag_scaler.fit_transform(frames["train"][["rag_readmit_rate_k10"]].values)
    rag_val   = rag_scaler.transform(frames["val"][["rag_readmit_rate_k10"]].values)
    rag_test  = rag_scaler.transform(frames["test"][["rag_readmit_rate_k10"]].values)

    # Build Tabular feature matrices (12 num + 22 cat = 34 columns)
    X_tr_tab = X_train_base
    X_vl_tab = X_val_base
    X_te_tab = X_test_base

    # Build Tabular + RAG feature matrices (13 num + 22 cat = 35 columns)
    # Insert rag feature right after column 11 (the 12th numerical feature)
    X_tr_rag = np.hstack([X_train_base[:, :12], rag_train, X_train_base[:, 12:]])
    X_vl_rag = np.hstack([X_val_base[:, :12],   rag_val,   X_val_base[:, 12:]])
    X_te_rag = np.hstack([X_test_base[:, :12],  rag_test,  X_test_base[:, 12:]])

    print(f"Tabular matrix shape:       {X_tr_tab.shape}")
    print(f"Tabular + RAG matrix shape: {X_tr_rag.shape}")

    return {
        "tab": (X_tr_tab, X_vl_tab, X_te_tab),
        "rag": (X_tr_rag, X_vl_rag, X_te_rag),
        "y": (y_train, y_val, y_test),
        "cat_cardinalities": cat_cardinalities,
        "rag_scaler": rag_scaler,
    }


def train_ft_variant(name, X_tr, y_tr, X_vl, y_vl, X_te, y_te, n_num, cat_cards, n_subsample=25000):
    print("\n" + "-" * 70)
    print(f"TRAINING FT-TRANSFORMER: {name} (n_num={n_num}, n_cat={len(cat_cards)})")
    print("-" * 70)

    # Stratified subsampling of training data for optimal CPU throughput
    if n_subsample and n_subsample < len(X_tr):
        sss = StratifiedShuffleSplit(n_splits=1, train_size=n_subsample, random_state=42)
        idx_train, _ = next(sss.split(X_tr, y_tr))
        X_train_fit, y_train_fit = X_tr[idx_train], y_tr[idx_train]
        print(f"  Using stratified training sample: {len(X_train_fit):,d} / {len(X_tr):,d} rows")
    else:
        X_train_fit, y_train_fit = X_tr, y_tr

    model = FTTransformerClassifier(
        n_num_features=n_num,
        cat_cardinalities=cat_cards,
        d_token=64,
        n_layers=3,
        n_heads=4,
        d_ff=128,
        dropout=0.1,
        lr=1e-3,
        weight_decay=1e-4,
        batch_size=256,
        epochs=12,
        patience=4,
    )

    print("  Fitting PyTorch model on CPU...")
    model.fit(X_train_fit, y_train_fit, eval_set=(X_vl, y_vl))

    print("  Evaluating probabilities on full validation and test splits...")
    p_val  = model.predict_proba(X_vl)[:, 1]
    p_test = model.predict_proba(X_te)[:, 1]

    opt_th = find_optimal_threshold(y_vl, p_val, metric="f1")
    print(f"  Optimal decision threshold (F1): {opt_th:.3f}", flush=True)

    metrics_val_def  = compute_metrics(y_vl, p_val, threshold=0.5)
    metrics_val_opt  = compute_metrics(y_vl, p_val, threshold=opt_th)
    metrics_test_def = compute_metrics(y_te, p_test, threshold=0.5)
    metrics_test_opt = compute_metrics(y_te, p_test, threshold=opt_th)

    print(f"  [VAL]  AUROC: {metrics_val_def['auroc']:.4f} | AUPRC: {metrics_val_def['auprc']:.4f} | F1: {metrics_val_opt['f1_score']:.4f}", flush=True)
    print(f"  [TEST] AUROC: {metrics_test_def['auroc']:.4f} | AUPRC: {metrics_test_def['auprc']:.4f} | F1: {metrics_test_opt['f1_score']:.4f} | Recall: {metrics_test_opt['recall_sensitivity']:.4f} | Precision: {metrics_test_opt['precision']:.4f}", flush=True)

    return {
        "model": model,
        "p_val": p_val,
        "p_test": p_test,
        "threshold": opt_th,
        "val_default_0.5": metrics_val_def,
        "val_optimal_thresh": metrics_val_opt,
        "test_default_0.5": metrics_test_def,
        "test_optimal_thresh": metrics_test_opt,
    }


def main():
    data = load_data_and_features()
    X_tr_tab, X_vl_tab, X_te_tab = data["tab"]
    X_tr_rag, X_vl_rag, X_te_rag = data["rag"]
    y_tr, y_vl, y_te = data["y"]
    cat_cards = data["cat_cardinalities"]

    # 1. Train FT-Transformer Tabular Only
    res_tab = train_ft_variant(
        "FT_Transformer_Tabular_Only",
        X_tr_tab, y_tr, X_vl_tab, y_vl, X_te_tab, y_te,
        n_num=12, cat_cards=cat_cards, n_subsample=25000,
    )

    # 2. Train FT-Transformer Tabular + Safe RAG (k=10)
    res_rag = train_ft_variant(
        "FT_Transformer_Tabular_Safe_RAG_k10",
        X_tr_rag, y_tr, X_vl_rag, y_vl, X_te_rag, y_te,
        n_num=13, cat_cards=cat_cards, n_subsample=25000,
    )

    # Save trained model weights & artifacts
    torch.save(res_tab["model"].model.state_dict(), os.path.join(MODELS_DIR, "ft_transformer.pt"))
    joblib.dump(res_tab["model"], os.path.join(MODELS_DIR, "ft_transformer.joblib"))
    joblib.dump(res_tab["model"], os.path.join(MODELS_DIR, "ft_tabular.joblib"))

    torch.save(res_rag["model"].model.state_dict(), os.path.join(MODELS_DIR, "ft_rag.pt"))
    joblib.dump(res_rag["model"], os.path.join(MODELS_DIR, "ft_rag.joblib"))
    joblib.dump(data["rag_scaler"], os.path.join(MODELS_DIR, "rag_scaler.joblib"))

    print("\n[SAVED] Serialized all FT-Transformer models to ml_engine/models/:")
    print(f"  - {MODELS_DIR}/ft_transformer.pt")
    print(f"  - {MODELS_DIR}/ft_transformer.joblib")
    print(f"  - {MODELS_DIR}/ft_rag.pt")
    print(f"  - {MODELS_DIR}/ft_rag.joblib")

    # Metrics summary
    safe_ft_summary = {
        "FT_Transformer_Tabular": {
            "val_auroc": res_tab["val_optimal_thresh"]["auroc"],
            "val_auprc": res_tab["val_optimal_thresh"]["auprc"],
            "test_auroc": res_tab["test_optimal_thresh"]["auroc"],
            "test_auprc": res_tab["test_optimal_thresh"]["auprc"],
            "test_f1": res_tab["test_optimal_thresh"]["f1_score"],
            "test_precision": res_tab["test_optimal_thresh"]["precision"],
            "test_recall": res_tab["test_optimal_thresh"]["recall_sensitivity"],
            "threshold": res_tab["threshold"],
            "detailed_val": res_tab["val_optimal_thresh"],
            "detailed_test": res_tab["test_optimal_thresh"],
        },
        "FT_Transformer_Tabular_RAG_k10": {
            "val_auroc": res_rag["val_optimal_thresh"]["auroc"],
            "val_auprc": res_rag["val_optimal_thresh"]["auprc"],
            "test_auroc": res_rag["test_optimal_thresh"]["auroc"],
            "test_auprc": res_rag["test_optimal_thresh"]["auprc"],
            "test_f1": res_rag["test_optimal_thresh"]["f1_score"],
            "test_precision": res_rag["test_optimal_thresh"]["precision"],
            "test_recall": res_rag["test_optimal_thresh"]["recall_sensitivity"],
            "threshold": res_rag["threshold"],
            "detailed_val": res_rag["val_optimal_thresh"],
            "detailed_test": res_rag["test_optimal_thresh"],
        },
    }

    metrics_file = os.path.join(METRICS_DIR, "ft_transformer_safe_metrics.json")
    with open(metrics_file, "w") as f:
        json.dump(safe_ft_summary, f, indent=2)
    print(f"[SAVED] Metrics saved to {metrics_file}")

    print("\n" + "=" * 70)
    print("FT-TRANSFORMER LEAKAGE-SAFE ABLATION RESULTS")
    print("=" * 70)
    print(f"FT-Transformer (Tabular):     Test AUROC={res_tab['test_optimal_thresh']['auroc']:.4f} | Test AUPRC={res_tab['test_optimal_thresh']['auprc']:.4f} | Recall={res_tab['test_optimal_thresh']['recall_sensitivity']:.4f}")
    print(f"FT-Transformer (Tabular+RAG): Test AUROC={res_rag['test_optimal_thresh']['auroc']:.4f} | Test AUPRC={res_rag['test_optimal_thresh']['auprc']:.4f} | Recall={res_rag['test_optimal_thresh']['recall_sensitivity']:.4f}")
    delta_auroc = res_rag['test_optimal_thresh']['auroc'] - res_tab['test_optimal_thresh']['auroc']
    delta_auprc = res_rag['test_optimal_thresh']['auprc'] - res_tab['test_optimal_thresh']['auprc']
    print(f"RAG Improvement Delta:        dAUROC={delta_auroc:+.4f} | dAUPRC={delta_auprc:+.4f}")
    print("=" * 70)


if __name__ == "__main__":
    main()
