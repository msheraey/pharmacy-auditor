# Branch & Staff Auditor — Build Plan

A mobile-first auditing app for a multi-branch UAE pharmacy operation, powered by Lovable Cloud (auth, Postgres, Storage). Auditors run live branch visits, score branch and staff checklists (1–5/N/A) with photo/comment evidence, and the system computes weighted scores, knockout red-flags, revisit bands, and per-staff cumulative scores that another system will consume.

Given the size of this spec, I'll build it in phases. This plan covers Phase 1 (foundation: backend, auth, core visit flow, seeded checklist). Phases 2–3 (admin screens, PDF/CSV export, trends, dashboards) follow after you approve the foundation and see it working end-to-end.

## Phase 1 — Foundation & Core Visit Flow

### 1. Enable Lovable Cloud
Provision Postgres, Auth, Storage.

### 2. Database schema (migration)
Tables per spec: `clusters`, `branches`, `staff`, `checklist_sections`, `checklist_points`, `visits`, `branch_audit_responses`, `staff_audit_responses`, `staff_scores`, `action_items`, `user_roles` (+ `app_role` enum: `super_admin | cluster_manager | viewer`).

- Grants on every public table.
- RLS everywhere. Roles table read-only to users for their own row; writes via service role only.
- `has_role(uuid, app_role)` security-definer function; `user_cluster(uuid)` helper for cluster scoping.
- Policies:
  - Super admin: full access via `has_role`.
  - Cluster manager: CRUD on visits/responses/action items where branch's cluster = their cluster.
  - Viewer: SELECT only on visits/responses/scores/branches/staff.
- Storage bucket `audit-evidence` (private) with RLS: authenticated insert; read for users who can read the parent visit.
- Trigger: on `visits.status → 'completed'`, recompute staff running averages into `staff_scores` and mark `action_items` overdue by date.

### 3. Seed data
Insert the full checklist exactly as specified (sections A1–A11 branch, B0–B4 staff) with `measure_text`, `knockout` flags, `delivery_only`, `applies_to_role`, and default weights (1.0; A5/A6 = 1.5). Seed a few example clusters/branches/staff for demo.

### 4. Auth
`/auth` route: email+password sign-in/sign-up (Lovable Cloud default). New signups get no role until a super admin assigns one; unassigned users see an "awaiting access" screen. First user can be promoted to `super_admin` via SQL note in README.

### 5. Route architecture (TanStack Start)
Public: `/`, `/auth`. Protected under `_authenticated/`:
- `/` dashboard
- `/visits/new` start visit
- `/visits/$visitId` audit flow (tabs: branch sections, staff audits, review)
- `/visits/$visitId/report` report screen
- `/branches`, `/branches/$branchId` profile
- `/staff/$staffId` score profile
- `/admin/checklist`, `/admin/users`, `/admin/branches`, `/admin/staff` (super admin only, gated by `_admin` layout via `has_role`)

### 6. Design system
Mobile-first. Pharmacy-clinical palette (calm teal/green primary, warm neutral bg, strong red for knockout/critical). Large tap targets (min 48px). Sticky bottom section nav on audit screens. Semantic tokens in `src/styles.css` (no ad-hoc colors). Score pills as a shadcn variant. Not purple.

### 7. Core visit flow (Phase 1 UI)
- **Dashboard**: recent visits, red-flagged, due revisits, branches not visited in N days, open action items count. Basic cluster/branch stats.
- **Start Visit**: branch picker (cluster-filtered), auto-stamps date/time/auditor; shows "Previous visit actions" panel to close/carry over.
- **Branch audit**: section list with progress rings → section detail with points; each point has score pills 1–5/N/A, collapsible measure_text, comment field, photo upload (client-side compressed to ~1200px JPEG). Knockout badge. Inline warning if score ≤2 and no evidence. Auto-save per response (no batch submit) so a dropped connection loses at most one response.
- **Staff audit**: enter staff code or search; pulls role; renders B0 + role section; delivery points hidden for Retail branches.
- **Review & Complete**: shows missing-evidence list; blocks completion until resolved; computes branch %, weighted %, People Index, knockout flag, revisit band; persists to `visits`; runs staff score aggregation trigger.
- **Report screen (v1)**: on-screen report with overall %, weighted %, People Index, revisit band badge, knockout alerts, per-section bars, per-staff cards, evidence appendix, "convert to action item" buttons. PDF export deferred to Phase 2.

### 8. Applicability rules
- `delivery_only` sections auto-N/A when `branch_profile = 'Retail'` (excluded from denominator).
- Role-based point filtering for staff audits.
- Score formula: `points / (5 × applicable_scored)` = raw %. Weighted = Σ(section% × weight) / Σ(weights). People Index = mean of staff audit %s.
- Revisit band computed server-side on completion.

## Phase 2 (next round, after Phase 1 lands)
- Checklist admin CRUD (sections, points, weights, reorder, activate/deactivate)
- User management (invite, assign role + cluster) — super admin
- Branch/staff/cluster admin CRUD
- PDF export + shareable report link
- CSV export (visits, responses, staff_scores)
- Trend charts on Branch/Staff profile pages
- Configurable "not visited in X days" threshold

## Phase 3
- Benchmark reports (filter by branch profile)
- Advanced dashboard analytics
- Email share of reports (via edge function + Resend)
- Polish & QA sweep

## Technical notes
- Backend: Lovable Cloud (Supabase). Reads from components via `useSuspenseQuery` + server publishable client for public data; user-scoped reads/writes via `createServerFn` + `requireSupabaseAuth`; RLS as the authoritative gate.
- Photos: browser `<canvas>` compress → upload to `audit-evidence` bucket → store `photo_url` on the response row.
- Point-by-point saves via `useMutation` targeting `upsert` on `(visit_id, checklist_point_id)` / `(visit_id, staff_id, checklist_point_id)`.
- Visit completion is a server function that: validates evidence, computes all scores, updates `visits`, aggregates `staff_scores`.

---

**Confirm to proceed with Phase 1**, or tell me to reorder / trim / expand any part before I start.
