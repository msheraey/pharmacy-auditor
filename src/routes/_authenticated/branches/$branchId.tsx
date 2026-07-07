import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, MapPin, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export const Route = createFileRoute("/_authenticated/branches/$branchId")({
  head: () => ({ meta: [{ title: "Branch Profile — Branch Auditor" }] }),
  component: BranchProfile,
});

function BranchProfile() {
  const { branchId } = Route.useParams();

  const { data: branch } = useQuery({
    queryKey: ["branch", branchId],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("*, clusters(name)").eq("id", branchId).single();
      return data as any;
    },
  });

  const { data: visits } = useQuery({
    queryKey: ["branch-visits", branchId],
    queryFn: async () => {
      const { data } = await supabase
        .from("visits")
        .select("id, visit_date, branch_score_pct, weighted_score_pct, red_flagged, revisit_band")
        .eq("branch_id", branchId)
        .eq("status", "completed")
        .order("visit_date", { ascending: false })
        .limit(30);
      return (data ?? []).reverse();
    },
  });

  const { data: actionItems } = useQuery({
    queryKey: ["branch-actions", branchId],
    queryFn: async () => {
      const { data } = await supabase
        .from("action_items")
        .select("id, description, status, due_date, created_at")
        .eq("branch_id", branchId)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const { data: sections } = useQuery({
    queryKey: ["sections"],
    queryFn: async () => (await supabase.from("checklist_sections").select("*").order("sort_order")).data ?? [],
  });

  const { data: lastBranchResp } = useQuery({
    queryKey: ["branch-last-resp", branchId],
    queryFn: async () => {
      if (!visits?.length) return [];
      const lastVisit = visits[visits.length - 1];
      if (!lastVisit) return [];
      const { data } = await supabase
        .from("branch_audit_responses")
        .select("*, checklist_points(section_id)")
        .eq("visit_id", lastVisit.id);
      return data ?? [];
    },
    enabled: !!visits && visits.length > 0,
  });

  if (!branch) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const openActions = actionItems?.filter((a) => a.status === "open" || a.status === "overdue") ?? [];
  const trendData = (visits ?? []).map((v) => ({
    date: v.visit_date.slice(5),
    Weighted: v.weighted_score_pct ?? 0,
    Raw: v.branch_score_pct ?? 0,
  }));

  const sectionScores: { code: string; pct: number }[] = [];
  const sectionMap = new Map((sections ?? []).map((s) => [s.id, s]));
  const bySection = new Map<string, { pts: number; max: number }>();
  for (const r of lastBranchResp ?? []) {
    if (r.is_na || r.score === null) continue;
    const sid = r.checklist_points?.section_id;
    if (!sid) continue;
    const agg = bySection.get(sid) ?? { pts: 0, max: 0 };
    agg.pts += r.score; agg.max += 5;
    bySection.set(sid, agg);
  }
  for (const [sid, agg] of bySection) {
    const sec = sectionMap.get(sid);
    if (!sec) continue;
    sectionScores.push({ code: `${sec.code}`, pct: agg.max ? (agg.pts / agg.max) * 100 : 0 });
  }
  sectionScores.sort((a, b) => a.code.localeCompare(b.code));

  const lastVisit = visits?.[visits?.length - 1];

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center gap-2">
        <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-lg font-semibold">{branch.name}</h1>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {branch.emirate} · {branch.branch_profile}{branch.clusters?.name ? ` · ${branch.clusters.name}` : ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Visits</div>
          <div className="mt-1 text-2xl font-semibold">{visits?.length ?? 0}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Last score</div>
          <div className="mt-1 text-2xl font-semibold">{lastVisit ? `${(lastVisit.weighted_score_pct ?? 0).toFixed(0)}%` : "—"}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Open actions</div>
          <div className="mt-1 text-2xl font-semibold">{openActions.length}</div>
        </div>
      </div>

      {trendData.length > 1 ? (
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold"><TrendingUp className="h-4 w-4" /> Score trend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="Weighted" stroke="#2a9d8f" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {sectionScores.length ? (
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">Last visit — section breakdown</h2>
          <ul className="space-y-2">
            {sectionScores.map((s) => (
              <li key={s.code}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{s.code}</span>
                  <span className="font-medium">{s.pct.toFixed(0)}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${s.pct}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {actionItems && actionItems.length ? (
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">Action items</h2>
          <ul className="space-y-2">
            {actionItems.slice(0, 10).map((a: any) => (
              <li key={a.id} className="flex items-center justify-between gap-3 rounded-md bg-background p-2 text-xs">
                <span className="min-w-0 flex-1">{a.description}</span>
                <span className={`shrink-0 rounded-md px-1.5 py-0.5 font-medium ${
                  a.status === "done" ? "bg-success/20 text-success" :
                  a.status === "overdue" ? "bg-destructive/10 text-destructive" :
                  "bg-warning/20 text-warning-foreground"
                }`}>
                  {a.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
