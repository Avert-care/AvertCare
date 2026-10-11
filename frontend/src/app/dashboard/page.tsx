"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  ShieldAlert,
  Stethoscope,
  Activity,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Bed,
  Clock,
  Sparkles,
  Hospital,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type PatientProfile = {
  patient_id: string;
  patient_name: string;
  room_number: string;
  discharge_time: string;
  primary_diagnosis: string;
  diag_1_group: string;
  a1c_result: string;
  time_in_hospital: number;
};

type AnalyzedRecord = {
  patient_id: string;
  patient_name: string;
  room_number: string;
  risk_score: number;
  risk_category: string;
  primary_diagnosis: string;
  care_plan: string[];
};

export default function DashboardPage() {
  const [pending, setPending] = useState<PatientProfile[]>([]);
  const [analyzed, setAnalyzed] = useState<AnalyzedRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const { getFreshToken } = useAuth();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const loadData = async () => {
    setLoading(true);
    try {
      const token = await getFreshToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const [resPending, resAnalyzed] = await Promise.allSettled([
        fetch(`${API_URL}/api/patients/pending`, { headers }),
        fetch(`${API_URL}/api/patients/analyzed`, { headers }),
      ]);

      if (resPending.status === "fulfilled" && resPending.value.ok) {
        setPending(await resPending.value.json());
      }
      if (resAnalyzed.status === "fulfilled" && resAnalyzed.value.ok) {
        setAnalyzed(await resAnalyzed.value.json());
      }
    } catch (e) {
      console.error("Dashboard failed to load:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const highRiskCount = analyzed.filter((a) => a.risk_score > 0.5).length;
  const elevatedRiskCount = analyzed.filter((a) => a.risk_score > 0.2 && a.risk_score <= 0.5).length;

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Clinical Command Dashboard</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-medium">
              Ward Census Workflow
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time inpatient discharge queue &amp; high-risk readmission stratification for Endocrinology 4W.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-850 hover:text-white transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          Refresh Stats
        </button>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Pending Discharges */}
        <Link
          href="/pending"
          className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-cyan-500/50 transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Pending Census</span>
            <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{pending.length}</span>
            <span className="text-xs text-slate-400">Patients awaiting triage</span>
          </div>
          <div className="mt-3 flex items-center text-xs font-semibold text-cyan-400 gap-1 group-hover:translate-x-1 transition-transform">
            <span>View Ward Census</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* High-Risk Alerts */}
        <Link
          href="/alerts"
          className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-rose-500/50 transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">High-Risk Alerts</span>
            <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20 group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{highRiskCount + elevatedRiskCount}</span>
            <span className="text-xs text-rose-300">
              {highRiskCount} Critical / {elevatedRiskCount} Elevated
            </span>
          </div>
          <div className="mt-3 flex items-center text-xs font-semibold text-rose-400 gap-1 group-hover:translate-x-1 transition-transform">
            <span>Review Priority Alerts</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* Total Analyzed */}
        <Link
          href="/alerts"
          className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-blue-500/50 transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Triaged Encounters</span>
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 group-hover:scale-110 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{analyzed.length}</span>
            <span className="text-xs text-slate-400">Completed predictions</span>
          </div>
          <div className="mt-3 flex items-center text-xs font-semibold text-blue-400 gap-1 group-hover:translate-x-1 transition-transform">
            <span>View Stratified Queue</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* AI & ML Engine Status */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Clinical AI Stack</span>
            <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <div className="text-xs flex items-center gap-1.5 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> XGBoost 2.1 Inference
            </div>
            <div className="text-xs flex items-center gap-1.5 text-cyan-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> TreeSHAP Explainability
            </div>
            <div className="text-xs flex items-center gap-1.5 text-purple-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Gemini 3.8 Care Plans
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Clinical Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Pending Discharges Waiting for Review */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Bed className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-semibold text-white">Pending Ward Census</h2>
            </div>
            <Link
              href="/pending"
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
            >
              <span>View All ({pending.length})</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {pending.slice(0, 4).map((p) => (
              <div
                key={p.patient_id}
                className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4 hover:border-slate-750 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-100">{p.patient_name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-cyan-400 border border-slate-800">
                      {p.patient_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span>{p.room_number}</span>
                    <span>•</span>
                    <span className="truncate max-w-[200px]" title={p.primary_diagnosis}>
                      {p.primary_diagnosis}
                    </span>
                    <span>•</span>
                    <span className="text-amber-400">{p.discharge_time}</span>
                  </div>
                </div>

                <Link
                  href={`/analyze?patient_id=${p.patient_id}`}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-medium shrink-0 flex items-center gap-1 shadow-sm"
                >
                  <span>Triage</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: High-Risk Alerts Stream */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <h2 className="text-base font-semibold text-white">Stratified Readmission Alerts</h2>
            </div>
            <Link
              href="/alerts"
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium"
            >
              <span>View All ({analyzed.length})</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {analyzed.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <p className="text-xs text-slate-400">No patients analyzed in this session yet.</p>
                <Link
                  href="/pending"
                  className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:underline mt-2"
                >
                  <span>Triage first patient from Census</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              analyzed.slice(0, 4).map((a) => (
                <div
                  key={a.patient_id}
                  className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4 hover:border-slate-750 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-100">{a.patient_name}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          a.risk_score > 0.5
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : a.risk_score > 0.2
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        }`}
                      >
                        {(a.risk_score * 100).toFixed(1)}% {a.risk_category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                      {a.care_plan?.[0] || a.primary_diagnosis}
                    </p>
                  </div>

                  <Link
                    href={`/analyze?patient_id=${a.patient_id}`}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium shrink-0 flex items-center gap-1"
                  >
                    <span>Chart</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
