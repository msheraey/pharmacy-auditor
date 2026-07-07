import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { AuditPointCard, type ResponseRow } from "@/components/audit-point-card";
import { SCORE_ANCHORS } from "@/components/score-picker";
import { computeBranchScores, type ScoredResponse } from "@/lib/scoring";
import type { Branch, ChecklistSection, ChecklistPoint, Staff, StaffRole } from "@/lib/types";
import { ArrowLeft, CheckCircle2, HelpCircle, User, Users, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/visits/$visitId/")({
  head: () => ({ meta: [{ title: "Visit — Branch Auditor" }] }),
  component: VisitFlow,
});

type Tab = "branch" | "staff" | "review";

function VisitFlow() {
  const { visitId } = Route.useParams();
  const { user } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("branch");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showAnchors, setShowAnchors] = useState(false);

  const { data: visit } = useQuery({
    queryKey: ["visit", visitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visits")
        .select("*, branches(*)")
        .eq("id", visitId)
        .single();
      if (error) throw error;
      return data as unknown as (typeof data & { branches: Branch });
    },
  });

  const { data: sections } = useQuery({
    queryKey: ["sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_sections")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data as ChecklistSection[];
    },
  });

  const { data: points } = useQuery({
    queryKey: ["points"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_points")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data as ChecklistPoint[];
    },
  });

  const { data: branchResponses } = useQuery({
    queryKey: ["branch-responses", visitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branch_audit_responses")
        .select("*")
        .eq("visit_id", visitId);
      if (error) throw error;
      return data;
    },
    enabled: !!visit,
  });

  const branchProfile = visit?.branches?.branch_profile;

  const branchSections = useMemo(
    () =>
      (sections ?? []).filter(
        (s) => s.scope === "branch" && (branchProfile !== "Retail" || !s.delivery_only),
      ),
    [sections, branchProfile],
  );

  const responsesByPoint = useMemo(() => {
    const m = new Map<string, ResponseRow>();
    for (const r of branchResponses ?? []) {
      m.set(r.checklist_point_id, {
        score: r.score,
        is_na: r.is_na,
        comment: r.comment,
        photo_url: r.photo_url,
      });
    }
    return m;
  }, [branchResponses]);

  const saveBranchResponse = useMutation({
    mutationFn: async ({ pointId, patch }: { pointId: string; patch: Partial<ResponseRow> }) => {
      if (!user) throw new Error("no user");
      const existing = responsesByPoint.get(pointId);
      const merged = {
        score: patch.score !== undefined ? patch.score : existing?.score ?? null,
        is_na: patch.is_na !== undefined ? patch.is_na : existing?.is_na ?? false,
        comment: patch.comment !== undefined ? patch.comment : existing?.comment ?? null,
        photo_url: patch.photo_url !== undefined ? patch.photo_url : existing?.photo_url ?? null,
      };
      const { error } = await supabase.from("branch_audit_responses").upsert(
        {
          visit_id: visitId,
          checklist_point_id: pointId,
          score: merged.score,
          is_na: merged.is_na,
          comment: merged.comment,
          photo_url: merged.photo_url,
          auditor_user_id: user.id,
        },
        { onConflict: "visit_id,checklist_point_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branch-responses", visitId] }),
  });

  if (!visit || !sections || !points) {
    return <div className="text-sm text-muted-foreground">Loading visit…</div>;
  }

  const branch = visit.branches;
  const isCompleted = visit.status === "completed";

  return (
    <div className="pb-24">
      <div className="mb-4 flex items-center gap-2">
        <Link to="/" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{branch.name}</h1>
          <p className="text-xs text-muted-foreground">
            {branch.emirate} · {branch.branch_profile} · {visit.visit_date} {visit.visit_time.slice(0, 5)}
          </p>
        </div>
        <button
          onClick={() => setShowAnchors(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          title="Score anchors"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-6 flex gap-1 rounded-lg border bg-card p-1 text-sm">
        {(["branch", "staff", "review"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setActiveSection(null); }}
            className={`flex-1 rounded-md px-3 py-2 text-center font-medium capitalize transition ${
              tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {t === "review" ? "Review & finish" : t}
          </button>
        ))}
      </div>

      {tab === "branch" ? (
        <BranchTab
          sections={branchSections}
          points={points}
          responsesByPoint={responsesByPoint}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          onSave={(pointId, patch) => saveBranchResponse.mutateAsync({ pointId, patch })}
          userId={user!.id}
          visitId={visitId}
          disabled={isCompleted}
        />
      ) : null}

      {tab === "staff" ? (
        <StaffTab visitId={visitId} branchId={branch.id} branchProfile={branchProfile} disabled={isCompleted} userId={user!.id} />
      ) : null}

      {tab === "review" ? (
        <ReviewTab
          visitId={visitId}
          branchSections={branchSections}
          points={points}
          responsesByPoint={responsesByPoint}
          onCompleted={() => navigate({ to: "/visits/$visitId/report", params: { visitId } })}
          isCompleted={isCompleted}
        />
      ) : null}

      {showAnchors ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setShowAnchors(false)}>
          <div className="w-full max-w-md rounded-t-2xl bg-card p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Score anchors</h3>
              <button onClick={() => setShowAnchors(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <ul className="space-y-2 text-sm">
              {SCORE_ANCHORS.map((a) => (
                <li key={String(a.s)} className="flex gap-3">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary font-semibold">{a.s}</span>
                  <span className="text-muted-foreground">{a.t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BranchTab({
  sections, points, responsesByPoint, activeSection, setActiveSection, onSave, userId, visitId, disabled,
}: {
  sections: ChecklistSection[];
  points: ChecklistPoint[];
  responsesByPoint: Map<string, ResponseRow>;
  activeSection: string | null;
  setActiveSection: (id: string | null) => void;
  onSave: (pointId: string, patch: Partial<ResponseRow>) => Promise<void>;
  userId: string;
  visitId: string;
  disabled?: boolean;
}) {
  if (activeSection) {
    const section = sections.find((s) => s.id === activeSection);
    const sectionPoints = points.filter((p) => p.section_id === activeSection);
    if (!section) return null;
    return (
      <div className="space-y-3">
        <button
          onClick={() => setActiveSection(null)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All sections
        </button>
        <div>
          <h2 className="text-lg font-semibold">
            <span className="text-muted-foreground">{section.code}</span> · {section.name}
          </h2>
          <p className="text-xs text-muted-foreground">
            Weight {section.weight}× {section.delivery_only ? "· delivery-only" : ""}
          </p>
        </div>
        {sectionPoints.map((p) => (
          <AuditPointCard
            key={p.id}
            pointId={p.id}
            pointText={p.point_text}
            measureText={p.measure_text}
            knockout={p.knockout}
            value={responsesByPoint.get(p.id)}
            onSave={(patch) => onSave(p.id, patch)}
            bucket="audit-evidence"
            userId={userId}
            storagePathPrefix={`visits/${visitId}/branch`}
            disabled={disabled}
          />
        ))}
      </div>
    );
  }

  return (
    <ul className="grid gap-2">
      {sections.map((s) => {
        const sectionPoints = points.filter((p) => p.section_id === s.id);
        const scored = sectionPoints.filter((p) => {
          const r = responsesByPoint.get(p.id);
          return r && (r.is_na || r.score !== null);
        }).length;
        const pct = sectionPoints.length ? Math.round((scored / sectionPoints.length) * 100) : 0;
        return (
          <li key={s.id}>
            <button
              onClick={() => setActiveSection(s.id)}
              className="w-full rounded-lg border bg-card p-4 text-left hover:bg-muted"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    <span className="text-muted-foreground">{s.code}</span> · {s.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {scored}/{sectionPoints.length} scored · weight {s.weight}×
                  </div>
                </div>
                <ProgressRing pct={pct} />
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <svg width={40} height={40} viewBox="0 0 40 40" className="shrink-0">
      <circle cx={20} cy={20} r={r} fill="none" stroke="var(--color-muted)" strokeWidth={4} />
      <circle
        cx={20} cy={20} r={r} fill="none"
        stroke="var(--color-primary)" strokeWidth={4}
        strokeDasharray={c} strokeDashoffset={off}
        strokeLinecap="round"
        transform="rotate(-90 20 20)"
      />
      <text x="20" y="24" textAnchor="middle" fontSize="10" fill="currentColor" className="font-semibold">
        {pct}%
      </text>
    </svg>
  );
}

function StaffTab({
  visitId, branchId, branchProfile, disabled, userId,
}: {
  visitId: string; branchId: string; branchProfile?: string; disabled?: boolean; userId: string;
}) {
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const qc = useQueryClient();

  const { data: staff } = useQuery({
    queryKey: ["staff-branch", branchId],
    queryFn: async () => {
      const { data, error } = await supabase.from("staff").select("*").eq("branch_id", branchId).eq("active", true).order("full_name");
      if (error) throw error;
      return data as Staff[];
    },
  });

  const { data: sections } = useQuery({ queryKey: ["sections"], queryFn: async () => {
    const { data, error } = await supabase.from("checklist_sections").select("*").eq("active", true).order("sort_order");
    if (error) throw error; return data as ChecklistSection[];
  }});
  const { data: points } = useQuery({ queryKey: ["points"], queryFn: async () => {
    const { data, error } = await supabase.from("checklist_points").select("*").eq("active", true).order("sort_order");
    if (error) throw error; return data as ChecklistPoint[];
  }});

  const { data: staffResponses } = useQuery({
    queryKey: ["staff-responses", visitId, selectedStaffId],
    queryFn: async () => {
      if (!selectedStaffId) return [];
      const { data, error } = await supabase
        .from("staff_audit_responses").select("*")
        .eq("visit_id", visitId).eq("staff_id", selectedStaffId);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedStaffId,
  });

  const { data: auditedStaff } = useQuery({
    queryKey: ["audited-staff", visitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_audit_responses").select("staff_id").eq("visit_id", visitId);
      if (error) throw error;
      return Array.from(new Set(data.map((r) => r.staff_id)));
    },
  });

  const selected = staff?.find((s) => s.id === selectedStaffId);
  const filtered = (staff ?? []).filter((s) =>
    q ? (s.full_name + " " + s.staff_code).toLowerCase().includes(q.toLowerCase()) : true,
  );

  const responsesByPoint = new Map<string, ResponseRow>();
  for (const r of staffResponses ?? []) {
    responsesByPoint.set(r.checklist_point_id, {
      score: r.score, is_na: r.is_na, comment: r.comment, photo_url: r.photo_url,
    });
  }

  const saveResp = useMutation({
    mutationFn: async ({ pointId, patch }: { pointId: string; patch: Partial<ResponseRow> }) => {
      if (!selectedStaffId) return;
      const existing = responsesByPoint.get(pointId);
      const merged = {
        score: patch.score !== undefined ? patch.score : existing?.score ?? null,
        is_na: patch.is_na !== undefined ? patch.is_na : existing?.is_na ?? false,
        comment: patch.comment !== undefined ? patch.comment : existing?.comment ?? null,
        photo_url: patch.photo_url !== undefined ? patch.photo_url : existing?.photo_url ?? null,
      };
      const { error } = await supabase.from("staff_audit_responses").upsert(
        {
          visit_id: visitId,
          staff_id: selectedStaffId,
          checklist_point_id: pointId,
          score: merged.score,
          is_na: merged.is_na,
          comment: merged.comment,
          photo_url: merged.photo_url,
          auditor_user_id: userId,
        },
        { onConflict: "visit_id,staff_id,checklist_point_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-responses", visitId, selectedStaffId] });
      qc.invalidateQueries({ queryKey: ["audited-staff", visitId] });
    },
  });

  if (selected && sections && points) {
    const applicable = sections.filter((s) =>
      s.scope === "staff" && (s.applies_to_role === null || s.applies_to_role === (selected.role as StaffRole)),
    );
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedStaffId(null)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All staff
        </button>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold">{selected.full_name}</div>
              <div className="text-xs text-muted-foreground">{selected.staff_code} · {selected.role}</div>
            </div>
          </div>
        </div>
        {applicable.map((section) => {
          const sectionPoints = points.filter((p) => {
            if (p.section_id !== section.id) return false;
            // Hide delivery-related pharmacist point on Retail branches
            if (branchProfile === "Retail" && /delivery|order|cold[- ]?chain/i.test(p.point_text)) return false;
            return true;
          });
          if (!sectionPoints.length) return null;
          return (
            <div key={section.id} className="space-y-2">
              <h3 className="text-sm font-semibold">
                <span className="text-muted-foreground">{section.code}</span> · {section.name}
              </h3>
              {sectionPoints.map((p) => (
                <AuditPointCard
                  key={p.id}
                  pointId={p.id}
                  pointText={p.point_text}
                  measureText={p.measure_text}
                  knockout={p.knockout}
                  value={responsesByPoint.get(p.id)}
                  onSave={(patch) => saveResp.mutateAsync({ pointId: p.id, patch })}
                  bucket="audit-evidence"
                  userId={userId}
                  storagePathPrefix={`visits/${visitId}/staff/${selected.id}`}
                  disabled={disabled}
                />
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" /> Pick a staff member to audit
      </div>
      <input
        placeholder="Search by name or staff code…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      {filtered.length === 0 ? (
        <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          No staff registered for this branch yet.
        </p>
      ) : (
        <ul className="grid gap-2">
          {filtered.map((s) => {
            const done = auditedStaff?.includes(s.id);
            return (
              <li key={s.id}>
                <button
                  onClick={() => setSelectedStaffId(s.id)}
                  className="w-full rounded-lg border bg-card p-4 text-left hover:bg-muted"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{s.full_name}</div>
                      <div className="text-xs text-muted-foreground">{s.staff_code} · {s.role}</div>
                    </div>
                    {done ? <CheckCircle2 className="h-5 w-5 text-success" /> : null}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ReviewTab({
  visitId, branchSections, points, responsesByPoint, onCompleted, isCompleted,
}: {
  visitId: string;
  branchSections: ChecklistSection[];
  points: ChecklistPoint[];
  responsesByPoint: Map<string, ResponseRow>;
  onCompleted: () => void;
  isCompleted: boolean;
}) {
  const qc = useQueryClient();
  const pointMap = new Map(points.map((p) => [p.id, p]));
  const sectionMap = new Map(branchSections.map((s) => [s.id, s]));

  const scored: ScoredResponse[] = [];
  const missingEvidence: { pointId: string; text: string; score: number }[] = [];
  const unscored: string[] = [];

  for (const sec of branchSections) {
    const secPoints = points.filter((p) => p.section_id === sec.id);
    for (const p of secPoints) {
      const r = responsesByPoint.get(p.id);
      if (!r || (r.score === null && !r.is_na)) {
        unscored.push(`${sec.code} · ${p.point_text}`);
        continue;
      }
      scored.push({
        score: r.score,
        is_na: r.is_na,
        section_code: sec.code,
        section_weight: Number(sec.weight),
        knockout: p.knockout,
      });
      if (r.score !== null && r.score <= 2 && !r.is_na && !r.comment?.trim() && !r.photo_url) {
        missingEvidence.push({ pointId: p.id, text: p.point_text, score: r.score });
      }
    }
  }

  const preview = computeBranchScores(scored);
  const canComplete = unscored.length === 0 && missingEvidence.length === 0;

  const { data: staffResponsesForPeople } = useQuery({
    queryKey: ["staff-people-index", visitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_audit_responses")
        .select("staff_id, score, is_na")
        .eq("visit_id", visitId);
      if (error) throw error;
      return data;
    },
  });

  const peopleIndex = (() => {
    if (!staffResponsesForPeople || staffResponsesForPeople.length === 0) return null;
    const byStaff: Record<string, { pts: number; max: number }> = {};
    for (const r of staffResponsesForPeople) {
      if (r.is_na || r.score === null) continue;
      const s = (byStaff[r.staff_id] ??= { pts: 0, max: 0 });
      s.pts += r.score;
      s.max += 5;
    }
    const pcts = Object.values(byStaff).map((s) => (s.max ? (s.pts / s.max) * 100 : 0));
    return pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null;
  })();

  const completeMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("visits")
        .update({
          status: "completed",
          branch_score_pct: preview.raw_pct,
          weighted_score_pct: preview.weighted_pct,
          people_index_pct: peopleIndex,
          red_flagged: preview.red_flagged,
          revisit_band: preview.band,
        })
        .eq("id", visitId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["visit", visitId] });
      onCompleted();
    },
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Preview
        </h3>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <Metric label="Raw" value={`${preview.raw_pct.toFixed(0)}%`} />
          <Metric label="Weighted" value={`${preview.weighted_pct.toFixed(0)}%`} />
          <Metric label="People Index" value={peopleIndex !== null ? `${peopleIndex.toFixed(0)}%` : "—"} />
        </div>
        {preview.red_flagged ? (
          <p className="mt-3 rounded-md bg-destructive/10 p-2 text-xs font-medium text-destructive">
            Knockout item scored 1 — visit will be red-flagged and a 7-day revisit scheduled.
          </p>
        ) : null}
      </div>

      {unscored.length ? (
        <div className="rounded-xl border border-warning bg-card p-4">
          <h3 className="text-sm font-semibold">Unscored branch points ({unscored.length})</h3>
          <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs text-muted-foreground">
            {unscored.map((u) => <li key={u}>· {u}</li>)}
          </ul>
        </div>
      ) : null}

      {missingEvidence.length ? (
        <div className="rounded-xl border border-warning bg-card p-4">
          <h3 className="text-sm font-semibold">Evidence required ({missingEvidence.length})</h3>
          <p className="text-xs text-muted-foreground">Scores of 1–2 need a photo or a comment.</p>
          <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs text-muted-foreground">
            {missingEvidence.map((m) => <li key={m.pointId}>· ({m.score}) {m.text}</li>)}
          </ul>
        </div>
      ) : null}

      <div className="rounded-xl border bg-card p-4">
        <h3 className="text-sm font-semibold">Per-section</h3>
        <ul className="mt-2 space-y-1 text-sm">
          {Object.entries(preview.section_pcts).map(([code, s]) => (
            <li key={code} className="flex items-center gap-2">
              <span className="w-10 text-xs text-muted-foreground">{code}</span>
              <span className="flex-1 truncate text-xs">
                {branchSections.find((b) => b.code === code)?.name}
              </span>
              <span className="w-14 text-right text-xs font-medium">{s.pct.toFixed(0)}%</span>
            </li>
          ))}
        </ul>
        {/* keep maps alive for HMR-friendly refs */}
        <span className="hidden">{pointMap.size}{sectionMap.size}</span>
      </div>

      {isCompleted ? (
        <div className="rounded-md bg-success/10 p-3 text-sm text-success">
          Visit completed. Open the report.
        </div>
      ) : (
        <button
          disabled={!canComplete || completeMut.isPending}
          onClick={() => completeMut.mutate()}
          className="h-12 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {completeMut.isPending ? "Finalising…" : "Complete visit"}
        </button>
      )}
      {completeMut.error ? <p className="text-xs text-destructive">{(completeMut.error as Error).message}</p> : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/60 p-3 text-center">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
