"use client";

import Link from "next/link";
import {
  X,
  User,
  ShieldAlert,
  AlertTriangle,
  Building,
  Calendar,
  Bed,
  Pill,
  Activity,
  FileText,
  DollarSign,
  HeartPulse,
  Clock,
  Sparkles,
  ArrowRight,
  Stethoscope,
  CheckCircle2,
} from "lucide-react";

export type DetailedPatient = {
  patient_id: string;
  patient_name?: string;
  age?: number;
  gender?: string;
  race?: string;
  primary_diagnosis?: string;
  diag_1_group?: string;
  diag_2_group?: string;
  diag_3_group?: string;
  time_in_hospital?: number;
  num_prior_admissions?: number;
  number_inpatient?: number;
  number_emergency?: number;
  number_outpatient?: number;
  num_medications?: number;
  clinical_note?: string;
  a1c_result?: string;
  max_glu_serum?: string;
  diabetes_med?: string;
  discharge_disposition?: string;
  admission_type_id?: string;
  admission_source_id?: string;
  medical_specialty?: string;
  payer_code?: string;
  change?: string;
  room_number?: string;
  discharge_time?: string;
  planned_discharge_time?: string;
  // Specific diabetic medications
  metformin?: string;
  insulin?: string;
  glipizide?: string;
  glyburide?: string;
  glimepiride?: string;
  // If already analyzed
  risk_score?: number;
  risk_category?: string;
  care_plan?: string[];
  sdoh_flags?: string[];
  clinical_rationale?: string;
  shap_features?: Array<{ feature: string; impact: number }>;
};

interface PatientDetailModalProps {
  patient: DetailedPatient | null;
  isOpen: boolean;
  onClose: () => void;
}

export function parsePayerInfo(code?: string): {
  label: string;
  category: "uninsured" | "medicaid" | "medicare" | "private" | "unknown";
  badgeClass: string;
} {
  const c = (code || "").trim().toUpperCase();
  if (c === "SP" || c === "SELF-PAY" || c === "SELF_PAY" || c === "UNINSURED") {
    return {
      label: "Uninsured (Self-Pay)",
      category: "uninsured",
      badgeClass: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    };
  }
  if (c === "MD" || c === "MEDICAID") {
    return {
      label: "Medicaid",
      category: "medicaid",
      badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    };
  }
  if (c === "MC" || c === "MEDICARE") {
    return {
      label: "Medicare",
      category: "medicare",
      badgeClass: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    };
  }
  if (c === "BC" || c === "HM" || c === "CP" || c === "PRIVATE") {
    return {
      label: "Private Insurance",
      category: "private",
      badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    };
  }
  return {
    label: code || "Not Documented",
    category: "unknown",
    badgeClass: "bg-slate-800 text-slate-300 border-slate-700",
  };
}

export function parseDischargeDisp(code?: string): string {
  const map: Record<string, string> = {
    "1": "Home (Routine Discharge)",
    "2": "Another Short-Term Hospital",
    "3": "Skilled Nursing Facility (SNF)",
    "4": "Intermediate Care Facility",
    "5": "Inpatient Rehabilitation",
    "6": "Home with Home Health Service",
    "7": "Left Against Medical Advice (AMA)",
  };
  return map[code || ""] || code || "Home";
}

export function parseAdmissionSource(code?: string): string {
  const map: Record<string, string> = {
    "7": "Emergency Room",
    "Emergency_Room": "Emergency Room",
    "1": "Physician Referral",
    "Physician_Referral": "Physician Referral",
    "2": "Clinic Referral",
    "Clinic_Referral": "Clinic Referral",
    "4": "Transfer from Hospital",
    "Transfer_Hospital": "Transfer from Hospital",
  };
  return map[code || ""] || code || "Referral";
}

export default function PatientDetailModal({
  patient,
  isOpen,
  onClose,
}: PatientDetailModalProps) {
  if (!isOpen || !patient) return null;

  const payer = parsePayerInfo(patient.payer_code);
  const totalPrior =
    (patient.number_inpatient ?? 0) +
    (patient.number_emergency ?? 0) +
    (patient.number_outpatient ?? 0);

  const isAnalyzed = typeof patient.risk_score === "number";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-cyan-950/40 my-8 overflow-hidden text-slate-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-950/60 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold text-lg shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {patient.patient_name || patient.patient_id}
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-850 text-cyan-400 border border-slate-750">
                  {patient.patient_id}
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${payer.badgeClass}`}
                >
                  {payer.category === "uninsured" && "⚠ "}
                  {payer.label}
                </span>
                {isAnalyzed && (
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      (patient.risk_score ?? 0) > 0.5
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : (patient.risk_score ?? 0) > 0.2
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}
                  >
                    {((patient.risk_score ?? 0) * 100).toFixed(1)}% {patient.risk_category}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1.5 flex-wrap">
                <span>
                  {patient.age ? `${patient.age} years old` : "Age N/A"} •{" "}
                  {patient.gender || "Gender unspecified"} •{" "}
                  {patient.race || "Race unspecified"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Bed className="w-3.5 h-3.5 text-slate-400" />
                  {patient.room_number || "Ward Room"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-amber-300">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  Planned: {patient.discharge_time || patient.planned_discharge_time || "Pending"}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-sm">
          {/* Uninsured Financial Risk Alert (if applicable) */}
          {payer.category === "uninsured" && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-rose-300 text-sm">
                  Uninsured / Self-Pay SDoH Financial Flag
                </h4>
                <p className="text-xs text-rose-200/90 mt-0.5 leading-relaxed">
                  Patient has no commercial or public insurance coverage. Highly vulnerable to
                  discharge medication non-adherence and abandonment due to insulin/prescription
                  copay costs. Priority referral to hospital financial navigation is strongly
                  recommended.
                </p>
              </div>
            </div>
          )}

          {/* Section 1: Encounter & Hospitalization History */}
          <div>
            <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Hospitalization &amp; Encounter History
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-xs text-slate-400">Current Stay</span>
                <div className="text-lg font-bold text-white mt-1">
                  {patient.time_in_hospital ?? "—"} days
                </div>
                <span className="text-[11px] text-slate-500">Inpatient duration</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-xs text-slate-400">Prior Inpatient</span>
                <div
                  className={`text-lg font-bold mt-1 ${
                    (patient.number_inpatient ?? 0) >= 2 ? "text-rose-400" : "text-white"
                  }`}
                >
                  {patient.number_inpatient ?? 0} admissions
                </div>
                <span className="text-[11px] text-slate-500">Major readmission driver</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-xs text-slate-400">Emergency Visits</span>
                <div
                  className={`text-lg font-bold mt-1 ${
                    (patient.number_emergency ?? 0) >= 1 ? "text-amber-400" : "text-white"
                  }`}
                >
                  {patient.number_emergency ?? 0} ER visits
                </div>
                <span className="text-[11px] text-slate-500">Prior 12-month acute</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-xs text-slate-400">Outpatient Visits</span>
                <div className="text-lg font-bold text-white mt-1">
                  {patient.number_outpatient ?? 0} visits
                </div>
                <span className="text-[11px] text-slate-500">Ambulatory clinic care</span>
              </div>
            </div>
          </div>

          {/* Section 2: Clinical Department & Admission Metadata */}
          <div>
            <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Building className="w-4 h-4 text-cyan-400" />
              Care Team, Location &amp; Admission
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-xs text-slate-400">Medical Specialty</span>
                <div className="text-sm font-semibold text-slate-200 mt-1">
                  {patient.medical_specialty || "General Medicine"}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-xs text-slate-400">Admission Source</span>
                <div className="text-sm font-semibold text-slate-200 mt-1">
                  {parseAdmissionSource(patient.admission_source_id)}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-xs text-slate-400">Discharge Destination</span>
                <div className="text-sm font-semibold text-slate-200 mt-1">
                  {parseDischargeDisp(patient.discharge_disposition)}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Diagnostic & Laboratory Profile */}
          <div>
            <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Clinical Diagnoses &amp; Glycemic Vitals
            </h3>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div>
                <span className="text-xs text-slate-400 font-medium">Primary Diagnosis:</span>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {patient.primary_diagnosis || "Diabetes Mellitus"}
                </p>
              </div>

              <div className="flex items-center gap-4 flex-wrap pt-2 border-t border-slate-850 text-xs">
                <div>
                  <span className="text-slate-400">Primary Group: </span>
                  <span className="text-cyan-400 font-medium">{patient.diag_1_group || "Diabetes"}</span>
                </div>
                {patient.diag_2_group && (
                  <div>
                    <span className="text-slate-400">Secondary Group: </span>
                    <span className="text-slate-200 font-medium">{patient.diag_2_group}</span>
                  </div>
                )}
                {patient.diag_3_group && (
                  <div>
                    <span className="text-slate-400">Tertiary Group: </span>
                    <span className="text-slate-200 font-medium">{patient.diag_3_group}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-850">
                <div>
                  <span className="text-[11px] text-slate-400">HbA1c Test</span>
                  <div
                    className={`text-sm font-bold mt-0.5 ${
                      patient.a1c_result === ">8"
                        ? "text-rose-400"
                        : patient.a1c_result === ">7"
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {patient.a1c_result === ">8"
                      ? "> 8.0% (Critical)"
                      : patient.a1c_result === ">7"
                      ? "> 7.0% (Elevated)"
                      : patient.a1c_result === "Norm"
                      ? "Normal (<7.0%)"
                      : "Not Measured"}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400">Serum Glucose</span>
                  <div
                    className={`text-sm font-bold mt-0.5 ${
                      patient.max_glu_serum === ">300"
                        ? "text-rose-400"
                        : patient.max_glu_serum === ">200"
                        ? "text-amber-400"
                        : "text-slate-200"
                    }`}
                  >
                    {patient.max_glu_serum === ">300"
                      ? "> 300 mg/dL"
                      : patient.max_glu_serum === ">200"
                      ? "> 200 mg/dL"
                      : patient.max_glu_serum === "Norm"
                      ? "Normal"
                      : "Not Tested"}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400">Medication Count</span>
                  <div
                    className={`text-sm font-bold mt-0.5 ${
                      (patient.num_medications ?? 0) >= 10 ? "text-amber-400" : "text-white"
                    }`}
                  >
                    {patient.num_medications ?? 0} meds
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400">Regimen Adjustment</span>
                  <div className="text-sm font-bold text-slate-200 mt-0.5">
                    {patient.change === "Ch" ? "Yes (Dosage changed)" : "No (Maintained)"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Specific Medications Profile */}
          <div>
            <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Pill className="w-4 h-4 text-cyan-400" />
              Diabetes Pharmacotherapy Regimen
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { name: "Insulin", val: patient.insulin },
                { name: "Metformin", val: patient.metformin },
                { name: "Glipizide", val: patient.glipizide },
                { name: "Glyburide", val: patient.glyburide },
              ].map((m) => (
                <div
                  key={m.name}
                  className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between"
                >
                  <span className="text-xs text-slate-300 font-medium">{m.name}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-semibold ${
                      m.val === "Up"
                        ? "bg-rose-500/20 text-rose-300"
                        : m.val === "Down"
                        ? "bg-amber-500/20 text-amber-300"
                        : m.val === "Steady"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    {m.val || "No"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Bedside Clinical Progress Note */}
          <div>
            <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              Bedside Progress Note (Clinical Documentation)
            </h3>
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 font-mono text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">
              {patient.clinical_note || "No clinical note transcribed."}
            </div>
          </div>

          {/* Section 6: AI Readmission Stratification (if analyzed) */}
          {isAnalyzed && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Triaged AI Risk Assessment
                </span>
                <span className="text-xs text-slate-400">
                  30-Day Hospital Readmission Model
                </span>
              </div>

              {patient.clinical_rationale && (
                <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                  &ldquo;{patient.clinical_rationale}&rdquo;
                </p>
              )}

              {patient.care_plan && patient.care_plan.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-semibold text-slate-300">
                    Active Prescriptive Care Plan:
                  </span>
                  <ul className="space-y-1">
                    {patient.care_plan.map((step, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-slate-300 flex items-start gap-2 bg-slate-900/40 p-2 rounded border border-slate-850"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-4 sticky bottom-0 z-10 backdrop-blur-md">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800 rounded-lg transition-colors border border-slate-750"
          >
            Close Chart
          </button>

          <Link
            href={`/analyze?patient_id=${patient.patient_id}`}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg shadow-md shadow-cyan-600/20 flex items-center gap-2 transition-all"
          >
            <span>Triage in Clinical Analyzer</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
