"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Clock,
  Bed,
  ArrowRight,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Activity,
  CheckCircle2,
  Calendar,
  Filter,
  FileText,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getApiBaseUrl, prewarmBackend } from "@/lib/api";
import PatientDetailModal from "@/components/PatientDetailModal";

type PatientProfile = {
  patient_id: string;
  patient_name: string;
  room_number: string;
  discharge_time: string;
  planned_discharge_time?: string;
  age: number;
  gender: string;
  primary_diagnosis: string;
  diag_1_group: string;
  time_in_hospital: number;
  num_medications: number;
  number_inpatient: number;
  number_emergency: number;
  number_outpatient: number;
  a1c_result: string;
  clinical_note: string;
  payer_code: string;
  admission_source_id: string;
  medical_specialty: string;
  race: string;
};

function payerLabel(code: string): { label: string; isUninsured: boolean; isMedicaid: boolean } {
  const map: Record<string, string> = {
    MC: "Medicare", MD: "Medicaid", SP: "Self-Pay", BC: "Blue Cross",
    HM: "HMO", CP: "Commercial", CM: "CHAMPUS", OG: "Other Govt",
    PO: "PPO", DM: "Dept Military", CH: "Charity", WC: "Workers Comp",
    UN: "Unknown", OT: "Other", MP: "Managed Plan", SI: "Self-Insured",
    Medicare: "Medicare", Medicaid: "Medicaid", Private: "Private Ins.",
    Unknown: "Unknown",
  };
  return {
    label: map[code] ?? code,
    isUninsured: code === "SP" || code === "Self-Pay",
    isMedicaid: code === "MD" || code === "Medicaid",
  };
}

function admissionSourceLabel(src: string): string {
  const map: Record<string, string> = {
    "7": "Emergency Room", Emergency_Room: "Emergency Room",
    "1": "Physician Referral", Physician_Referral: "Physician Referral",
    "2": "Clinic Referral", Clinic_Referral: "Clinic Referral",
    "4": "Hospital Transfer",
    "5": "SNF Transfer",
    "6": "Facility Transfer",
    "17": "Not Available",
    Other: "Other",
  };
  return map[src] ?? src.replaceAll("_", " ");
}

export default function WardCensusPage() {
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDiag, setFilterDiag] = useState<string>("All");
  const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(null);

  const { user, getFreshToken } = useAuth();
  const API_URL = getApiBaseUrl();

  useEffect(() => {
    prewarmBackend();
  }, []);

  const fetchPendingPatients = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getFreshToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      };

      const res = await fetch(`${API_URL}/api/patients/pending`, { headers });
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data = await res.json();
      setPatients(data);
    } catch (err: unknown) {
      console.error("Error fetching ward census:", err);
      setError("Unable to load ward census queue from backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingPatients();
  }, [user]);

  const filteredPatients = patients.filter((patient) => {
    const matchesSearch =
      patient.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.patient_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.room_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.primary_diagnosis.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = filterDiag === "All" || patient.diag_1_group === filterDiag;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header & KPI Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Ward Census · Pending Discharges</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-medium">
              Live EHR Queue
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Active hospital inpatients scheduled for discharge. Click &ldquo;Analyze Chart&rdquo; to trigger ML readmission scoring.
          </p>
        </div>

        <button
          onClick={fetchPendingPatients}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-850 hover:text-white transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          Refresh Census
        </button>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">Pending Discharges</p>
            <p className="text-2xl font-bold text-white mt-1">{patients.length}</p>
          </div>
          <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">Active Department</p>
            <p className="text-base font-semibold text-slate-200 mt-1">Endocrinology &amp; Acute</p>
          </div>
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Bed className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">Triage Protocol</p>
            <p className="text-base font-semibold text-emerald-400 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Real-Time XGBoost
            </p>
          </div>
          <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800/70">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by patient name, MRN, room number, or diagnosis…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterDiag}
            onChange={(e) => setFilterDiag(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="All">All Diagnosis Groups</option>
            <option value="Diabetes">Diabetes</option>
            <option value="Circulatory">Circulatory</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Patients Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
            <p className="text-sm">Fetching ward census data…</p>
          </div>
        ) : error ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
            <AlertCircle className="w-8 h-8 text-rose-400" />
            <p className="text-sm text-rose-400 font-medium">{error}</p>
            <button
              onClick={fetchPendingPatients}
              className="text-xs text-cyan-400 underline hover:text-cyan-300 mt-1"
            >
              Try reconnecting to backend
            </button>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-sm">No patients match your search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Patient / MRN</th>
                  <th className="py-3.5 px-4">Room &amp; Admission</th>
                  <th className="py-3.5 px-4">Diagnosis &amp; Specialty</th>
                  <th className="py-3.5 px-4">Insurance</th>
                  <th className="py-3.5 px-4">Utilization History</th>
                  <th className="py-3.5 px-4">Discharge Target</th>
                  <th className="py-3.5 px-4 text-right">Clinical Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPatients.map((p) => (
                  <tr
                    key={p.patient_id}
                    className="hover:bg-slate-900/50 transition-colors group"
                  >
                    {/* Patient Name */}
                    <td className="py-4 px-4 font-medium text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-950 to-slate-900 border border-cyan-800/60 flex items-center justify-center text-cyan-300 font-semibold text-xs">
                          {p.patient_name ? p.patient_name[0] : "P"}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
                            {p.patient_name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                            <span>{p.patient_id}</span>
                            <span>•</span>
                            <span>Age {p.age}</span>
                            <span>•</span>
                            <span>{p.gender}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Room & Admission Source */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-200">
                        <Bed className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{p.room_number}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Stay: {p.time_in_hospital}d</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Via: {admissionSourceLabel(p.admission_source_id || "Other")}
                      </div>
                    </td>

                    {/* Diagnosis & Specialty */}
                    <td className="py-4 px-4 max-w-xs">
                      <div className="text-slate-200 line-clamp-1 font-medium" title={p.primary_diagnosis}>
                        {p.primary_diagnosis}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/50">
                          {p.diag_1_group}
                        </span>
                        {p.medical_specialty && p.medical_specialty !== "Unknown" && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/50">
                            {p.medical_specialty.replaceAll("_", " ")}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Insurance / Payer */}
                    {(() => {
                      const payer = payerLabel(p.payer_code || "Unknown");
                      return (
                        <td className="py-4 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              payer.isUninsured
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : payer.isMedicaid
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-slate-700/60 text-slate-300 border border-slate-700"
                            }`}
                          >
                            {payer.label}
                          </span>
                          {payer.isUninsured && (
                            <div className="text-[10px] text-rose-400 mt-1 font-medium">⚠ Uninsured</div>
                          )}
                          <div className="text-[11px] text-slate-500 mt-1">
                            A1C: <span className={p.a1c_result === ">8" ? "text-rose-400 font-semibold" : p.a1c_result === ">7" ? "text-amber-400" : "text-slate-400"}>{p.a1c_result}</span>
                          </div>
                        </td>
                      );
                    })()}

                    {/* Utilization History */}
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="text-slate-500 w-16">Inpatient:</span>
                          <span className={`font-semibold ${(p.number_inpatient || 0) >= 3 ? "text-rose-400" : (p.number_inpatient || 0) >= 1 ? "text-amber-400" : "text-emerald-400"}`}>
                            {p.number_inpatient ?? 0}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="text-slate-500 w-16">ER Visits:</span>
                          <span className={`font-semibold ${(p.number_emergency || 0) >= 2 ? "text-rose-400" : (p.number_emergency || 0) >= 1 ? "text-amber-400" : "text-slate-400"}`}>
                            {p.number_emergency ?? 0}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="text-slate-500 w-16">Outpatient:</span>
                          <span className="text-slate-400">{p.number_outpatient ?? 0}</span>
                        </div>
                      </div>
                    </td>

                    {/* Scheduled Discharge Time */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{p.discharge_time || p.planned_discharge_time || "Pending"}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Physician sign-off pending</div>
                    </td>

                    {/* Action Buttons */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedPatient(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                          title="View complete clinical chart and notes"
                        >
                          <FileText className="w-3 h-3 text-cyan-400" />
                          <span>View Chart</span>
                        </button>
                        <Link
                          href={`/analyze?patient_id=${p.patient_id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs shadow-sm shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all"
                        >
                          <Sparkles className="w-3 h-3 text-cyan-200" />
                          <span>Triage</span>
                          <ArrowRight className="w-3 h-3 text-cyan-200" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Patient Clinical Detail Modal */}
      <PatientDetailModal
        patient={selectedPatient}
        isOpen={!!selectedPatient}
        onClose={() => setSelectedPatient(null)}
      />
    </div>
  );
}
