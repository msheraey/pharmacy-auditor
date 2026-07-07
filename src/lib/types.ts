export type BranchProfile = "Retail" | "Delivery" | "Mixed" | "24-Hour";
export type StaffRole = "Pharmacist" | "Salesperson" | "Preparation" | "Branch Manager";
export type VisitStatus = "in_progress" | "completed";
export type ActionItemStatus = "open" | "done" | "overdue";
export type ChecklistScope = "branch" | "staff";
export type RevisitBand = "routine" | "action_plan" | "focused_30d" | "urgent_7d";

export interface Cluster { id: string; name: string }
export interface Branch {
  id: string; name: string; emirate: string; cluster_id: string | null;
  branch_profile: BranchProfile; active: boolean;
}
export interface Staff {
  id: string; staff_code: string; full_name: string; role: StaffRole;
  branch_id: string | null; dha_license_status: string | null; active: boolean;
}
export interface ChecklistSection {
  id: string; code: string; name: string; scope: ChecklistScope;
  applies_to_role: StaffRole | null; delivery_only: boolean;
  weight: number; sort_order: number; active: boolean;
}
export interface ChecklistPoint {
  id: string; section_id: string; point_text: string; measure_text: string | null;
  knockout: boolean; sort_order: number; active: boolean;
}
export interface Visit {
  id: string; branch_id: string; auditor_user_id: string;
  visit_date: string; visit_time: string; status: VisitStatus;
  overall_notes: string | null;
  branch_score_pct: number | null; weighted_score_pct: number | null; people_index_pct: number | null;
  red_flagged: boolean; revisit_band: RevisitBand | null; completed_at: string | null;
  created_at: string;
}
