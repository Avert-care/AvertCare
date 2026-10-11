"""
AvertCare Backend · Mock Database (In-Memory Clinical Storage)

Provides synthetic patient queues for the active ward census workflow:
- PENDING_PATIENTS: Inpatients awaiting discharge evaluation.
- ANALYZED_PATIENTS: Patients evaluated with ML readmission risk & AI care plans.
"""

from __future__ import annotations

from app.schemas import AnalyzedRecord, PatientProfile

# ─────────────────────────────────────────────────────────────
# 5 Synthetic Diabetic Patients matching 34-column ML schema
# ─────────────────────────────────────────────────────────────

PENDING_PATIENTS: list[PatientProfile] = [
    PatientProfile(
        patient_id="PT-1042",
        patient_name="Eleanor Vance",
        discharge_time="Today, 14:00",
        planned_discharge_time="Today, 14:00",
        room_number="Room 412-A",
        age=68,
        primary_diagnosis="Type 2 Diabetes Mellitus with hyperosmolarity and chronic kidney disease stage 3",
        time_in_hospital=6,
        num_prior_admissions=2,
        num_medications=14,
        clinical_note=(
            "Patient is a 68yo female admitted for uncontrolled hyperglycemia and acute renal insufficiency. "
            "Lives alone on fixed income, reports difficulty affording basal insulin and frequent skipped meals. "
            "High fall risk, unsteady gait noted upon ambulation."
        ),
        a1c_result=">8",
        number_inpatient=2,
        number_emergency=1,
        number_diagnoses=9,
        diabetes_med="Yes",
        gender="Female",
        discharge_disposition="1",  # Home
        diag_1_group="Diabetes",
        num_lab_procedures=58,
        num_procedures=1,
        number_outpatient=2,
        admission_type_id="Emergency",
        admission_source_id="Emergency_Room",
        change="Ch",
        diag_2_group="Circulatory",
        diag_3_group="Genitourinary",
        max_glu_serum=">300",
        medical_specialty="Endocrinology",
        payer_code="Medicare",
        race="Caucasian",
        metformin="No",
        repaglinide="No",
        glimepiride="No",
        glipizide="No",
        glyburide="No",
        pioglitazone="No",
        rosiglitazone="No",
        insulin="Up",
    ),
    PatientProfile(
        patient_id="PT-2091",
        patient_name="Arthur Pendelton",
        discharge_time="Today, 15:30",
        planned_discharge_time="Today, 15:30",
        room_number="Room 305-B",
        age=74,
        primary_diagnosis="Type 2 Diabetes Mellitus with peripheral circulatory complications and diabetic foot ulcer",
        time_in_hospital=8,
        num_prior_admissions=3,
        num_medications=16,
        clinical_note=(
            "74yo male with recurrent diabetic ulcer right heel requiring wound debridement. "
            "SDoH assessment reveals patient lives alone with limited mobility, lacks transportation for "
            "outpatient wound clinic visits. History of medication non-compliance due to pharmacy costs."
        ),
        a1c_result=">8",
        number_inpatient=3,
        number_emergency=2,
        number_diagnoses=11,
        diabetes_med="Yes",
        gender="Male",
        discharge_disposition="6",  # Home with home health
        diag_1_group="Diabetes",
        num_lab_procedures=64,
        num_procedures=2,
        number_outpatient=1,
        admission_type_id="Emergency",
        admission_source_id="Emergency_Room",
        change="Ch",
        diag_2_group="Circulatory",
        diag_3_group="Other",
        max_glu_serum="Not_Tested",
        medical_specialty="InternalMedicine",
        payer_code="Medicare",
        race="AfricanAmerican",
        metformin="Steady",
        repaglinide="No",
        glimepiride="No",
        glipizide="Up",
        glyburide="No",
        pioglitazone="No",
        rosiglitazone="No",
        insulin="Steady",
    ),
    PatientProfile(
        patient_id="PT-3184",
        patient_name="Elena Rostova",
        discharge_time="Today, 17:00",
        planned_discharge_time="Today, 17:00",
        room_number="Room 218-C",
        age=52,
        primary_diagnosis="Type 1 Diabetes Mellitus with ketoacidosis, moderate without coma",
        time_in_hospital=4,
        num_prior_admissions=1,
        num_medications=7,
        clinical_note=(
            "52yo female presenting with DKA precipitated by viral gastroenteritis. Resolved with IV regular insulin "
            "and aggressive electrolyte replacement. Strong family support at home; adult daughter will assist with "
            "subcutaneous glargine titration and continuous glucose monitoring."
        ),
        a1c_result=">7",
        number_inpatient=1,
        number_emergency=0,
        number_diagnoses=5,
        diabetes_med="Yes",
        gender="Female",
        discharge_disposition="1",  # Home
        diag_1_group="Diabetes",
        num_lab_procedures=45,
        num_procedures=0,
        number_outpatient=0,
        admission_type_id="Urgent",
        admission_source_id="Emergency_Room",
        change="Ch",
        diag_2_group="Digestive",
        diag_3_group="Other",
        max_glu_serum="Norm",
        medical_specialty="FamilyPractice",
        payer_code="Private",
        race="Caucasian",
        metformin="No",
        repaglinide="No",
        glimepiride="No",
        glipizide="No",
        glyburide="No",
        pioglitazone="No",
        rosiglitazone="No",
        insulin="Steady",
    ),
    PatientProfile(
        patient_id="PT-4205",
        patient_name="Marcus Vance",
        discharge_time="Tomorrow, 10:00",
        planned_discharge_time="Tomorrow, 10:00",
        room_number="Room 501-A",
        age=61,
        primary_diagnosis="Type 2 Diabetes Mellitus without acute complications, routine stabilization",
        time_in_hospital=3,
        num_prior_admissions=0,
        num_medications=5,
        clinical_note=(
            "61yo male admitted for elective glycemic optimization and lifestyle counseling. "
            "High health literacy, reliable commercial health insurance, stable home environment. "
            "PCP follow-up confirmed in 5 business days."
        ),
        a1c_result="Norm",
        number_inpatient=0,
        number_emergency=0,
        number_diagnoses=4,
        diabetes_med="Yes",
        gender="Male",
        discharge_disposition="1",  # Home
        diag_1_group="Diabetes",
        num_lab_procedures=32,
        num_procedures=0,
        number_outpatient=3,
        admission_type_id="Elective",
        admission_source_id="Physician_Referral",
        change="No",
        diag_2_group="Other",
        diag_3_group="Other",
        max_glu_serum="Norm",
        medical_specialty="InternalMedicine",
        payer_code="Private",
        race="Caucasian",
        metformin="Steady",
        repaglinide="No",
        glimepiride="No",
        glipizide="No",
        glyburide="No",
        pioglitazone="No",
        rosiglitazone="No",
        insulin="No",
    ),
    PatientProfile(
        patient_id="PT-5510",
        patient_name="Dorothy Gale",
        discharge_time="Tomorrow, 11:30",
        planned_discharge_time="Tomorrow, 11:30",
        room_number="Room 104-B",
        age=81,
        primary_diagnosis="Type 2 Diabetes Mellitus with hypoglycemic syncope and mechanical fall",
        time_in_hospital=7,
        num_prior_admissions=4,
        num_medications=18,
        clinical_note=(
            "81yo female admitted following acute hypoglycemic collapse at home. Severe polypharmacy with multiple "
            "oral hypoglycemic agents and insulin. Caregiver fatigue reported by primary family contact. "
            "High ongoing risk of medication error and severe recurrent hypoglycemia."
        ),
        a1c_result=">8",
        number_inpatient=4,
        number_emergency=3,
        number_diagnoses=12,
        diabetes_med="Yes",
        gender="Female",
        discharge_disposition="3",  # Skilled nursing facility
        diag_1_group="Diabetes",
        num_lab_procedures=71,
        num_procedures=1,
        number_outpatient=1,
        admission_type_id="Emergency",
        admission_source_id="Emergency_Room",
        change="Ch",
        diag_2_group="Circulatory",
        diag_3_group="Respiratory",
        max_glu_serum=">200",
        medical_specialty="Emergency",
        payer_code="Medicare",
        race="Caucasian",
        metformin="No",
        repaglinide="No",
        glimepiride="Down",
        glipizide="No",
        glyburide="Down",
        pioglitazone="No",
        rosiglitazone="No",
        insulin="Steady",
    ),
    PatientProfile(
        patient_id="PT-6320",
        patient_name="Raymond Chen",
        discharge_time="Today, 18:00",
        planned_discharge_time="Today, 18:00",
        room_number="Room 310-A",
        age=59,
        primary_diagnosis="Type 2 Diabetes Mellitus with diabetic polyneuropathy and Charcot arthropathy",
        time_in_hospital=5,
        num_prior_admissions=1,
        num_medications=11,
        clinical_note=(
            "59yo male with chronic diabetic peripheral neuropathy presenting with acute neuropathic pain exacerbation. "
            "Lives with spouse who is supportive. Patient works as accountant, reports good health literacy but "
            "erratic meal schedule during tax season. Regimen adjusted to bedtime long-acting insulin."
        ),
        a1c_result=">7",
        number_inpatient=1,
        number_emergency=1,
        number_diagnoses=7,
        diabetes_med="Yes",
        gender="Male",
        discharge_disposition="1",
        diag_1_group="Diabetes",
        num_lab_procedures=48,
        num_procedures=1,
        number_outpatient=4,
        admission_type_id="Urgent",
        admission_source_id="Clinic_Referral",
        change="Ch",
        diag_2_group="Musculoskeletal",
        diag_3_group="Circulatory",
        max_glu_serum="Norm",
        medical_specialty="Neurology",
        payer_code="Private",
        race="Asian",
        metformin="Steady",
        repaglinide="No",
        glimepiride="No",
        glipizide="Steady",
        glyburide="No",
        pioglitazone="No",
        rosiglitazone="No",
        insulin="Up",
    ),
    PatientProfile(
        patient_id="PT-7144",
        patient_name="Beatrice Holloway",
        discharge_time="Tomorrow, 09:30",
        planned_discharge_time="Tomorrow, 09:30",
        room_number="Room 422-B",
        age=71,
        primary_diagnosis="Type 2 Diabetes Mellitus with hypertensive heart disease and fluid overload",
        time_in_hospital=9,
        num_prior_admissions=3,
        num_medications=15,
        clinical_note=(
            "71yo female admitted for decompensated heart failure precipitated by glycemic variability and dietary indiscretion. "
            "Lives in senior living community, requires walker. Fixed income, relies on daughter for weekly pillbox filling. "
            "Polypharmacy reconciliation critical prior to discharge."
        ),
        a1c_result=">8",
        number_inpatient=3,
        number_emergency=2,
        number_diagnoses=10,
        diabetes_med="Yes",
        gender="Female",
        discharge_disposition="6",
        diag_1_group="Diabetes",
        num_lab_procedures=62,
        num_procedures=2,
        number_outpatient=1,
        admission_type_id="Emergency",
        admission_source_id="Emergency_Room",
        change="Ch",
        diag_2_group="Circulatory",
        diag_3_group="Respiratory",
        max_glu_serum=">200",
        medical_specialty="Cardiology",
        payer_code="Medicare",
        race="AfricanAmerican",
        metformin="No",
        repaglinide="No",
        glimepiride="No",
        glipizide="No",
        glyburide="No",
        pioglitazone="No",
        rosiglitazone="No",
        insulin="Up",
    ),
    PatientProfile(
        patient_id="PT-8890",
        patient_name="Samuel Jackson",
        discharge_time="Tomorrow, 14:00",
        planned_discharge_time="Tomorrow, 14:00",
        room_number="Room 205-A",
        age=46,
        primary_diagnosis="Type 2 Diabetes Mellitus, newly diagnosed with mild hyperosmolar state",
        time_in_hospital=2,
        num_prior_admissions=0,
        num_medications=4,
        clinical_note=(
            "46yo male presenting with new-onset diabetes following routine physical. Promptly responded to oral metformin "
            "and hydration. Active marathon runner with exceptional cardiovascular baseline. Comprehensive diabetes self-management "
            "education completed with certified diabetes care specialist."
        ),
        a1c_result="Norm",
        number_inpatient=0,
        number_emergency=0,
        number_diagnoses=3,
        diabetes_med="Yes",
        gender="Male",
        discharge_disposition="1",
        diag_1_group="Diabetes",
        num_lab_procedures=28,
        num_procedures=0,
        number_outpatient=0,
        admission_type_id="Elective",
        admission_source_id="Physician_Referral",
        change="No",
        diag_2_group="Other",
        diag_3_group="Other",
        max_glu_serum="Norm",
        medical_specialty="FamilyPractice",
        payer_code="Private",
        race="AfricanAmerican",
        metformin="Steady",
        repaglinide="No",
        glimepiride="No",
        glipizide="No",
        glyburide="No",
        pioglitazone="No",
        rosiglitazone="No",
        insulin="No",
    ),
]

INITIAL_PENDING_PATIENTS: list[PatientProfile] = list(PENDING_PATIENTS)

# ─────────────────────────────────────────────────────────────
# Analyzed Queue (populated upon prediction)
# ─────────────────────────────────────────────────────────────
ANALYZED_PATIENTS: list[AnalyzedRecord] = []


def reset_mock_db() -> None:
    """Restores the initial pending census and clears the analyzed queue."""
    global PENDING_PATIENTS, ANALYZED_PATIENTS
    PENDING_PATIENTS = [PatientProfile(**p.model_dump()) for p in INITIAL_PENDING_PATIENTS]
    ANALYZED_PATIENTS = []

