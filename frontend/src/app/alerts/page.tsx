"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Activity,
  DollarSign,
  Sparkles,
  Users,
  Bed,
  Clock,
  ArrowRight,
  RefreshCw,
  X,
  FileText,
  Search,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getApiBaseUrl, prewarmBackend } from "@/lib/api";

type SHAPFeature = {
  feature: string;
  impact: number;
};

type AnalyzedRecord = {
  patient_id: string;
  patient_name: string;
  room_number: string;
  discharge_time: string;
  age: number;
  gender: string;
  primary_diagnosis: string;
  diag_1_group: string;
  time_in_hospital: number;
  num_medications: number;
  number_inpatient: number;
  a1c_result: string;
  clinical_note: string;
  risk_score: number;
  risk_category: string;
  care_plan: string[];
  shap_features: SHAPFeature[];
  sdoh_flags: string[];
  clinical_rationale: string;
  plan_source?: string;
  cms_penalty_saved_usd?: number | null;
  relative_risk_ratio?: number | null;
  risk_percentile?: number | null;
  analyzed_at?: string;
};

function getRiskBadge(score: number) {
  if (score > 0.5) {
    return {
      label: "Critical Risk (>50%)",
      badgeClass: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
      rowClass: "bg-rose-950/15 hover:bg-rose-950/30 border-l-4 border-l-rose-500",
      textClass: "text-rose-400 font-bold",
    };
  }
  if (score > 0.2) {
    return {
      label: "Elevated Risk (>20%)",
      badgeClass: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
      rowClass: "bg-amber-950/10 hover:bg-amber-950/20 border-l-4 border-l-amber-500",
      textClass: "text-amber-400 font-semibold",
    };
  }
  return {
    label: "Low Risk (≤20%)",
    badgeClass: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
    rowClass: "hover:bg-slate-900/60 border-l-4 border-l-emerald-500",
    textClass: "text-emerald-400 font-semibold",
  };
}

function shapLabel(feature: string): string {
  const named: Record<string, string> = {
    "num__number_inpatient": "Prior inpatient visits",
    "num__total_prior_visits": "Total prior visits",
    "num__number_emergency": "Emergency visits",
    "num__number_diagnoses": "Diagnosis count",
    "num__time_in_hospital": "Length of stay",
    "num__age_numeric": "Age",
    "num__num_medications": "Medication count",
    "num__num_meds_active": "Active diabetes meds",
    "num__num_lab_procedures": "Lab procedures",
    "rag_readmit_rate": "Similar-patient readmit rate",
    "cat__discharge_disposition_id_1": "Discharged home",
    "cat__discharge_disposition_id_2": "Transferred to another hospital",
    "cat__discharge_disposition_id_3": "Discharged to skilled nursing",
    "cat__discharge_disposition_id_4": "Discharged to intermediate care",
    "cat__discharge_disposition_id_5": "Discharged to other inpatient care",
    "cat__discharge_disposition_id_6": "Home with home health",
    "cat__discharge_disposition_id_7": "Left against medical advice",
    "cat__discharge_disposition_id_22": "Discharged to rehab",
    "cat__discharge_disposition_id_Other": "Other discharge destination",
    "cat__diag_1_group_Diabetes": "Primary diagnosis: diabetes",
    "cat__diag_1_group_Circulatory": "Primary diagnosis: circulatory",
    "cat__diag_1_group_Respiratory": "Primary diagnosis: respiratory",
    "cat__payer_code_Unknown": "Payer unknown",
  };
  return named[feature] ?? feature.replace(/^num__|^cat__/, "").replaceAll("_", " ");
}

export default function AlertsPage() {
  const [analyzedList, setAnalyzedList] = useState<AnalyzedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<AnalyzedRecord | null>(null);
  const [search, setSearch] = useState("");

  const { getFreshToken } = useAuth();
  const API_URL = getApiBaseUrl();

  useEffect(() => {
    prewarmBackend();
  }, []);

  const fetchAnalyzedPatients = async () => {
    setLoading(true);
    try {
      const token = await getFreshToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/api/patients/analyzed`, { headers });
      if (res.ok) {
        const data = await res.json();
        setAnalyzedList(data);
      }
    } catch (e) {
      console.error("Failed to load analyzed patients:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyzedPatients();
  }, []);

  const criticalCount = analyzedList.filter((r) => r.risk_score > 0.5).length;
  const elevatedCount = analyzedList.filter((r) => r.risk_score > 0.2 && r.risk_score <= 0.5).length;
  const lowCount = analyzedList.filter((r) => r.risk_score <= 0.2).length;

  const filteredList = analyzedList.filter(
    (r) =>
      r.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      r.patient_id.toLowerCase().includes(search.toLowerCase()) ||
      r.room_number.toLowerCase().includes(search.toLowerCase()) ||
      r.primary_diagnosis.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">High-Risk Stratification Alerts</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 font-medium">
              Priority Care Queue
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Inpatients stratified dynamically by XGBoost readmission risk. Click any row to review AI care plans and SHAP drivers.
          </p>
        </div>

        <button
          onClick={fetchAnalyzedPatients}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-850 hover:text-white transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          Refresh Alerts
        </button>
      </div>

      {/* Stratification Tiers Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">Total Evaluated</p>
            <p className="text-2xl font-bold text-white mt-1">{analyzedList.length}</p>
          </div>
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-rose-300 font-medium">Critical Risk (&gt;50%)</p>
            <p className="text-2xl font-bold text-rose-400 mt-1">{criticalCount}</p>
          </div>
          <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-900/40 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-amber-300 font-medium">Elevated Risk (&gt;20%)</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{elevatedCount}</p>
          </div>
          <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/40 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-emerald-300 font-medium">Low Risk (≤20%)</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{lowCount}</p>
          </div>
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800/70">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search analyzed patients by name, room, or diagnosis…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <p className="text-xs text-slate-400">
          Click any row for full clinical deep dive.
        </p>
      </div>

      {/* Alerts Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
            <p className="text-sm">Stratifying analyzed discharges…</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <ShieldAlert className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-medium text-slate-300">No patients analyzed in this session yet.</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Visit the Ward Census to triage pending discharges. Once analyzed, high-risk patients will appear here sorted by risk.
            </p>
            <Link
              href="/pending"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white mt-2"
            >
              <span>Go to Ward Census</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Risk Tier</th>
                  <th className="py-3.5 px-4">Patient / MRN</th>
                  <th className="py-3.5 px-4">Room &amp; Discharge</th>
                  <th className="py-3.5 px-4">Primary Diagnosis</th>
                  <th className="py-3.5 px-4">SDoH Signal</th>
                  <th className="py-3.5 px-4">AI Care Plan</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredList.map((record) => {
                  const riskStyle = getRiskBadge(record.risk_score);

                  return (
                    <tr
                      key={record.patient_id}
                      onClick={() => setSelectedRecord(record)}
                      className={`cursor-pointer transition-colors ${riskStyle.rowClass}`}
                    >
                      {/* Risk Score */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`text-base ${riskStyle.textClass}`}>
                            {(record.risk_score * 100).toFixed(1)}%
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${riskStyle.badgeClass}`}>
                            {record.risk_category}
                          </span>
                        </div>
                        {record.relative_risk_ratio && (
                          <div className="text-[10px] text-slate-400 mt-1">
                            {record.relative_risk_ratio}x baseline
                          </div>
                        )}
                      </td>

                      {/* Patient Details */}
                      <td className="py-4 px-4">
                        <div className="font-semibold text-white text-sm">
                          {record.patient_name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                          <span>{record.patient_id}</span>
                          <span>•</span>
                          <span>Age {record.age}</span>
                        </div>
                      </td>

                      {/* Room & Discharge */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                          <Bed className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{record.room_number}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{record.discharge_time || "Pending"}</span>
                        </div>
                      </td>

                      {/* Diagnosis */}
                      <td className="py-4 px-4 max-w-xs">
                        <div className="text-slate-200 line-clamp-1 font-medium" title={record.primary_diagnosis}>
                          {record.primary_diagnosis}
                        </div>
                        <span className="text-[10px] text-cyan-400 mt-0.5 block">
                          Stay: {record.time_in_hospital}d • {record.number_inpatient} admits
                        </span>
                      </td>

                      {/* SDoH Flags */}
                      <td className="py-4 px-4">
                        {record.sdoh_flags && record.sdoh_flags.length > 0 && record.sdoh_flags[0] !== "No SDoH signals detected" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20">
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            {record.sdoh_flags[0]}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">None flagged</span>
                        )}
                      </td>

                      {/* Care Plan snippet */}
                      <td className="py-4 px-4 max-w-xs">
                        <p className="text-slate-300 line-clamp-1 text-[11px]">
                          {record.care_plan?.[0] || "Review interventions in chart"}
                        </p>
                        {record.care_plan?.length > 1 && (
                          <span className="text-[10px] text-slate-400">
                            +{record.care_plan.length - 1} more actions
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedRecord(record)}
                            className="px-2.5 py-1 text-[11px] font-medium text-cyan-300 hover:text-white bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800 rounded-lg transition-colors"
                          >
                            Deep Dive
                          </button>
                          <Link
                            href={`/analyze?patient_id=${record.patient_id}`}
                            className="px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <span>Chart</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deep Dive Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 md:p-8 space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">{selectedRecord.patient_name}</h2>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                    {selectedRecord.patient_id}
                  </span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${getRiskBadge(selectedRecord.risk_score).badgeClass}`}>
                    {selectedRecord.risk_category} ({(selectedRecord.risk_score * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                  <span>Room: {selectedRecord.room_number}</span>
                  <span>•</span>
                  <span>Age: {selectedRecord.age}</span>
                  <span>•</span>
                  <span>Stay: {selectedRecord.time_in_hospital} days</span>
                  <span>•</span>
                  <span>Scheduled: {selectedRecord.discharge_time}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedRecord(null)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Prescriptive Care Plan */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Prescriptive Care Plan
                </h3>
                {selectedRecord.plan_source === "gemini" && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Gemini LLM
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {selectedRecord.care_plan?.map((action, i) => (
                  <div key={i} className="flex gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <div className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">{action}</p>
                  </div>
                ))}
              </div>

              {selectedRecord.clinical_rationale && (
                <p className="text-xs text-slate-400 italic bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
                  &ldquo;{selectedRecord.clinical_rationale}&rdquo;
                </p>
              )}
            </div>

            {/* SDoH Flags & Top Drivers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SDoH */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Social Determinants (SDoH)
                </h4>
                {selectedRecord.sdoh_flags && selectedRecord.sdoh_flags.length > 0 && selectedRecord.sdoh_flags[0] !== "No SDoH signals detected" ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRecord.sdoh_flags.map((flag, idx) => (
                      <span key={idx} className="text-xs px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20">
                        {flag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No social risk factors identified.</p>
                )}
              </div>

              {/* Financial Penalty Avoidance */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  CMS HRRP Financial Impact
                </h4>
                {selectedRecord.cms_penalty_saved_usd ? (
                  <div>
                    <div className="text-xl font-bold text-emerald-400">${selectedRecord.cms_penalty_saved_usd.toLocaleString()}</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Projected hospital penalty avoidance</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Baseline discharge without high-penalty risk threshold.</p>
                )}
              </div>
            </div>

            {/* SHAP Impact Drivers */}
            {selectedRecord.shap_features && selectedRecord.shap_features.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-purple-400" />
                  Top Model Drivers (TreeSHAP)
                </h4>
                <div className="space-y-2">
                  {selectedRecord.shap_features.slice(0, 4).map((f) => (
                    <div key={f.feature} className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">{shapLabel(f.feature)}</span>
                      <span className={`font-mono font-medium ${f.impact > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                        {f.impact > 0 ? "+" : ""}{f.impact.toFixed(3)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                Close
              </button>
              <Link
                href={`/analyze?patient_id=${selectedRecord.patient_id}`}
                className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl shadow-md shadow-cyan-500/20 flex items-center gap-1.5 transition-all"
              >
                <span>Open Full Clinical Chart</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
