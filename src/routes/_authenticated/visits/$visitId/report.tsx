import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { bandLabel } from "@/lib/scoring";
import type { Branch, RevisitBand, Staff } from "@/lib/types";
import { useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, Circle, ClipboardCheck, Download, Plus, ShieldAlert, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/visits/$visitId/report")({
  head: () => ({ meta: [{ title: "Visit report — Branch Auditor" }] }),
  component: ReportPage,
});

function ReportPage() {
  const { visitId } = Route.useParams();
  const qc = useQueryClient();
  const [newActionText, setNewActionText] = useState("");
  const [newActionPointId, setNewActionPointId] = useState<string | null>(null);

  const { data: visit } = useQuery({
    queryKey: ["visit-report", visitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visits").select("*, branches(*)").eq("id", visitId).single();
      if (error) throw error;
      return data as unknown as (typeof data & { branches: Branch });
    },
  });

  const { data: sections } = useQuery({
    queryKey: ["sections"],
    queryFn: async () => (await supabase.from("checklist_sections").select("*").order("sort_order")).data ?? [],
  });
  const { data: points } = useQuery({
    queryKey: ["points"],
    queryFn: async () => (await supabase.from("checklist_points").select("*").order("sort_order")).data ?? [],
  });

  const { data: branchResp } = useQuery({
    queryKey: ["branch-responses", visitId],
    queryFn: async () => (await supabase.from("branch_audit_responses").select("*").eq("visit_id", visitId)).data ?? [],
  });

  const { data: staffResp } = useQuery({
    queryKey: ["staff-responses-all", visitId],
    queryFn: async () => (await supabase.from("staff_audit_responses").select("*").eq("visit_id", visitId)).data ?? [],
  });

  const { data: allStaff } = useQuery({
    queryKey: ["all-staff"],
    queryFn: async () => (await supabase.from("staff").select("*")).data ?? [] as Staff[],
  });

  const { data: actionItems } = useQuery({
    queryKey: ["action-items", visitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("action_items")
        .select("*, checklist_points(point_text)")
        .eq("visit_id", visitId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as (typeof data) & { checklist_points: { point_text: string } | null }[];
    },
  });

  const createAction = useMutation({
    mutationFn: async ({ pointId, description }: { pointId: string; description: string }) => {
      const { error } = await supabase.from("action_items").insert({
        visit_id: visitId, checklist_point_id: pointId, description, status: "open",
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["action-items", visitId] }); setNewActionText(""); setNewActionPointId(null); },
  });

  const toggleAction = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("action_items").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["action-items", visitId] }),
  });

  if (!visit || !sections || !points) {
    return <div className="text-sm text-muted-foreground">Loading report…</div>;
  }

  const sectionMap = new Map(sections.map((s) => [s.id, s]));
  const pointMap = new Map(points.map((p) => [p.id, p]));

  // Section breakdown
  const sectionRows: { code: string; name: string; pct: number; weight: number }[] = [];
  const bySection = new Map<string, { pts: number; max: number }>();
  for (const r of branchResp ?? []) {
    if (r.is_na || r.score === null) continue;
    const p = pointMap.get(r.checklist_point_id);
    if (!p) continue;
    const s = bySection.get(p.section_id) ?? { pts: 0, max: 0 };
    s.pts += r.score; s.max += 5;
    bySection.set(p.section_id, s);
  }
  for (const [sid, agg] of bySection) {
    const sec = sectionMap.get(sid);
    if (!sec) continue;
    sectionRows.push({ code: sec.code, name: sec.name, pct: agg.max ? (agg.pts / agg.max) * 100 : 0, weight: Number(sec.weight) });
  }
  sectionRows.sort((a, b) => a.code.localeCompare(b.code));

  // Evidence appendix
  const evidence = (branchResp ?? []).filter(
    (r) => (r.score !== null && r.score <= 2 && !r.is_na) || r.photo_url,
  );

  // Per-staff results
  const staffAgg = new Map<string, { pts: number; max: number }>();
  for (const r of staffResp ?? []) {
    if (r.is_na || r.score === null) continue;
    const s = staffAgg.get(r.staff_id) ?? { pts: 0, max: 0 };
    s.pts += r.score; s.max += 5;
    staffAgg.set(r.staff_id, s);
  }

  const band = visit.revisit_band as RevisitBand | null;

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center gap-2">
        <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Visit report</div>
          <h1 className="truncate text-xl font-semibold">{visit.branches.name}</h1>
          <p className="text-xs text-muted-foreground">
            {visit.visit_date} {visit.visit_time.slice(0, 5)} · {visit.branches.emirate} · {visit.branches.branch_profile}
          </p>
        </div>
        <Link
          to="/visits/$visitId" params={{ visitId }}
          className="rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-muted"
        >
          Edit
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Big label="Raw score" value={visit.branch_score_pct !== null ? `${visit.branch_score_pct.toFixed(0)}%` : "—"} />
        <Big label="Weighted" value={visit.weighted_score_pct !== null ? `${visit.weighted_score_pct.toFixed(0)}%` : "—"} tone="primary" />
        <Big label="People Index" value={visit.people_index_pct !== null ? `${visit.people_index_pct.toFixed(0)}%` : "—"} />
      </div>

      {visit.red_flagged ? (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/60 bg-destructive/5 p-4 text-sm">
          <ShieldAlert className="mt-0.5 h-5 w-5 text-destructive" />
          <div>
            <div className="font-semibold text-destructive">Knockout failure — visit red-flagged</div>
            <div className="text-xs text-muted-foreground">A knockout point scored 1. Escalate to operations and revisit within 7 days.</div>
          </div>
        </div>
      ) : null}

      {band ? (
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Revisit band</div>
          <div className="mt-1 text-sm font-medium">{bandLabel[band]}</div>
        </div>
      ) : null}

      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-2 text-sm font-semibold">Per-section breakdown</h2>
        <ul className="space-y-2">
          {sectionRows.map((s) => (
            <li key={s.code}>
              <div className="flex items-center justify-between text-xs">
                <span><span className="text-muted-foreground">{s.code}</span> · {s.name}</span>
                <span className="font-medium">{s.pct.toFixed(0)}%  <span className="text-muted-foreground">· w{s.weight}×</span></span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${s.pct}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-2 text-sm font-semibold">Staff audited</h2>
        {staffAgg.size === 0 ? (
          <p className="text-xs text-muted-foreground">No staff audits recorded on this visit.</p>
        ) : (
          <ul className="divide-y">
            {[...staffAgg.entries()].map(([sid, agg]) => {
              const s = allStaff?.find((x) => x.id === sid);
              const pct = agg.max ? (agg.pts / agg.max) * 100 : 0;
              return (
                <li key={sid} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="font-medium">{s?.full_name ?? "Unknown"}</div>
                    <div className="text-xs text-muted-foreground">{s?.staff_code} · {s?.role}</div>
                  </div>
                  <div className="text-sm font-semibold">{pct.toFixed(0)}%</div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4 text-warning-foreground" /> Evidence appendix
        </h2>
        {evidence.length === 0 ? (
          <p className="text-xs text-muted-foreground">No comments or photos captured.</p>
        ) : (
          <ul className="space-y-3">
            {evidence.map((r) => {
              const p = pointMap.get(r.checklist_point_id);
              const sec = p ? sectionMap.get(p.section_id) : null;
              return (
                <li key={r.id} className="rounded-md border bg-background p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium">{sec?.code}</span>
                    <span className="font-medium">{p?.point_text}</span>
                    {r.score !== null ? <span className="ml-auto rounded-md bg-muted px-1.5 py-0.5 font-semibold">{r.score}</span> : null}
                  </div>
                  {r.comment ? <p className="mt-1 text-muted-foreground">"{r.comment}"</p> : null}
                  {r.photo_url ? <PhotoThumb path={r.photo_url} /> : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 className="h-4 w-4 text-success" /> Action items
        </h2>

        <div className="mb-3 space-y-2">
          {(actionItems ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">No action items yet.</p>
          ) : (
            <ul className="space-y-1">
              {actionItems?.map((a) => (
                <li key={a.id} className="flex items-start gap-2 rounded-md bg-muted/40 p-2 text-xs">
                  <button onClick={() => toggleAction.mutate({ id: a.id, status: a.status === "done" ? "open" : "done" })} className="mt-0.5">
                    {a.status === "done" ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className={a.status === "done" ? "line-through text-muted-foreground" : ""}>{a.description}</div>
                    <div className="text-[10px] text-muted-foreground">{a.checklist_points?.point_text}</div>
                  </div>
                  <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                    a.status === "overdue" ? "bg-destructive/10 text-destructive" : a.status === "done" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                  }`}>{a.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          {newActionPointId ? (
            <div className="rounded-md border bg-background p-3 text-xs space-y-2">
              <p className="text-muted-foreground">
                Point: {pointMap.get(newActionPointId)?.point_text}
              </p>
              <textarea
                placeholder="Describe the corrective action needed…"
                value={newActionText}
                onChange={(e) => setNewActionText(e.target.value)}
                rows={2}
                className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => createAction.mutate({ pointId: newActionPointId, description: newActionText })}
                  disabled={!newActionText.trim() || createAction.isPending}
                  className="inline-flex h-7 items-center gap-1 rounded bg-primary px-2 text-[10px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  <Plus className="h-3 w-3" /> Create
                </button>
                <button onClick={() => { setNewActionPointId(null); setNewActionText(""); }} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ) : null}
        </div>

        {evidence.length > 0 ? (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              Create action from low-scoring point…
            </summary>
            <ul className="mt-2 space-y-1">
              {evidence.filter((r) => r.score !== null && r.score <= 2).map((r) => {
                const p = pointMap.get(r.checklist_point_id);
                return (
                  <li key={r.id}>
                    <button
                      onClick={() => setNewActionPointId(r.checklist_point_id)}
                      className="w-full rounded-md bg-muted/30 p-2 text-left text-xs hover:bg-muted"
                    >
                      <span className="text-muted-foreground">Score {r.score} · </span>
                      {p?.point_text}
                    </button>
                  </li>
                );
              })}
            </ul>
          </details>
        ) : null}
      </section>

      <button
        onClick={() => exportCSV(visit, sectionRows, evidence, points, sections, staffAgg, allStaff ?? [], actionItems ?? [])}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-muted"
      >
        <Download className="h-3.5 w-3.5" /> Export CSV
      </button>
    </div>
  );
}

function exportCSV(
  visit: any, sectionRows: { code: string; name: string; pct: number; weight: number }[],
  evidence: any[], points: any[], sections: any[],
  staffAgg: Map<string, { pts: number; max: number }>, allStaff: Staff[],
  actionItems: any[],
) {
  const rows: string[] = ["section,point,score,comment,suggested_action"];
  const pm = new Map(points.map((p: any) => [p.id, p]));
  const sm = new Map(sections.map((s: any) => [s.id, s]));
  for (const r of evidence) {
    const p = pm.get(r.checklist_point_id);
    const sec = p ? sm.get(p.section_id) : null;
    const action = actionItems.find((a: any) => a.checklist_point_id === r.checklist_point_id);
    rows.push([
      sec?.code ?? "", p?.point_text ?? "", r.score ?? "",
      (r.comment ?? "").replace(/"/g, '""'),
      action ? `"${action.description.replace(/"/g, '""')}"` : "",
    ].join(","));
  }
  rows.push(""); rows.push("section_score,score_pct,weight");
  for (const s of sectionRows) rows.push(`${s.code},${s.pct.toFixed(1)}%,${s.weight}`);
  rows.push(""); rows.push("staff_member,staff_code,pct");
  for (const [sid, agg] of staffAgg) {
    const s = allStaff.find((x) => x.id === sid);
    const pct = agg.max ? (agg.pts / agg.max) * 100 : 0;
    rows.push(`${s?.full_name ?? "Unknown"},${s?.staff_code ?? ""},${pct.toFixed(1)}%`);
  }
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const branchName = (visit.branches as any)?.name ?? "branch";
  a.href = url; a.download = `${branchName}_${visit.visit_date}_audit.csv`; a.click();
  URL.revokeObjectURL(url);
}

function PhotoThumb({ path }: { path: string }) {
  const { data } = useQuery({
    queryKey: ["signed", path],
    queryFn: async () => (await supabase.storage.from("audit-evidence").createSignedUrl(path, 3600)).data?.signedUrl ?? null,
  });
  if (!data) return null;
  return (
    <a href={data} target="_blank" rel="noreferrer" className="mt-2 block">
      <img src={data} alt="evidence" className="h-32 w-full rounded-md object-cover" />
    </a>
  );
}

function Big({ label, value, tone }: { label: string; value: string; tone?: "primary" }) {
  return (
    <div className={`rounded-xl border p-4 text-center ${tone === "primary" ? "bg-primary text-primary-foreground" : "bg-card"}`}>
      <div className={`text-[10px] uppercase tracking-wide ${tone === "primary" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
