import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useUserRoles, hasRole } from "@/lib/auth";
import { AlertTriangle, CalendarClock, ClipboardCheck, Download, MapPin, Plus, TrendingUp } from "lucide-react";
import { bandLabel } from "@/lib/scoring";
import type { RevisitBand } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Branch Auditor" }] }),
  component: Dashboard,
});

const DAYS_SINCE_THRESHOLD = 30;

function Dashboard() {
  const { user } = useSession();
  const { roles } = useUserRoles(user?.id);
  const canWrite = hasRole(roles, "super_admin") || hasRole(roles, "cluster_manager");

  const { data: recentVisits } = useQuery({
    queryKey: ["dashboard-recent-visits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visits")
        .select("id, visit_date, visit_time, status, branch_score_pct, weighted_score_pct, red_flagged, revisit_band, branches(name, emirate)")
        .order("visit_date", { ascending: false })
        .order("visit_time", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const { data: openActions } = useQuery({
    queryKey: ["dashboard-open-actions"],
    queryFn: async () => {
      const { count } = await supabase
        .from("action_items")
        .select("*", { count: "exact", head: true })
        .in("status", ["open", "overdue"]);
      return count ?? 0;
    },
  });

  const branches = useQuery({
    queryKey: ["dashboard-branches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("id, name, emirate, branch_profile")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const redFlagged = recentVisits?.filter((v) => v.red_flagged) ?? [];
  const routineOrHigher = new Set<RevisitBand>(["urgent_7d", "focused_30d", "action_plan"]);
  const revisitDue = recentVisits?.filter((v) => v.revisit_band && routineOrHigher.has(v.revisit_band as RevisitBand)) ?? [];

  const lastVisitByBranch = new Map<string, string>();
  for (const v of recentVisits ?? []) {
    const key = (v as unknown as { branches: { name: string } | null }).branches?.name ?? "";
    if (!lastVisitByBranch.has(key)) lastVisitByBranch.set(key, v.visit_date);
  }
  const visitData = useMemo(() => recentVisits ?? [], [recentVisits]);

  const exportDashboardCSV = () => {
    const rows = ["date,branch,emirate,status,score%25,weighted%25,red_flagged,band"];
    for (const v of visitData) {
      const b = (v as unknown as { branches: { name: string; emirate: string } | null }).branches;
      rows.push([
        v.visit_date, b?.name ?? "", b?.emirate ?? "", v.status,
        v.branch_score_pct?.toFixed(1) ?? "", v.weighted_score_pct?.toFixed(1) ?? "",
        v.red_flagged ? "yes" : "no", v.revisit_band ?? "",
      ].join(","));
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `visits_export_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const staleBranches = (branches.data ?? []).filter((b) => {
    const last = lastVisitByBranch.get(b.name);
    if (!last) return true;
    const days = (Date.now() - new Date(last).getTime()) / 86400000;
    return days > DAYS_SINCE_THRESHOLD;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {roles?.map((r) => r.role.replace("_", " ")).join(", ") || "no role"}
          </p>
        </div>
        {canWrite ? (
          <Link
            to="/visits/new"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-all hover:opacity-90 active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" /> Start visit
          </Link>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={<ClipboardCheck className="h-4 w-4" />} label="Recent visits" value={recentVisits?.length ?? 0} />
        <Stat icon={<AlertTriangle className="h-4 w-4" />} label="Red-flagged" value={redFlagged.length} tone="danger" />
        <Stat icon={<CalendarClock className="h-4 w-4" />} label="Revisits due" value={revisitDue.length} tone="warning" />
        <Stat icon={<TrendingUp className="h-4 w-4" />} label="Open actions" value={openActions ?? 0} />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={exportDashboardCSV}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input bg-background px-3 text-xs font-medium transition-all hover:bg-muted hover:shadow-xs"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      {redFlagged.length ? (
        <Panel title="Red-flagged branches" tone="danger">
          <ul className="divide-y">
            {redFlagged.map((v) => (
              <li key={v.id} className="table-row-hover first:-mt-0.5">
                <Link to="/visits/$visitId/report" params={{ visitId: v.id }} className="flex items-center justify-between gap-3 px-1 py-3 no-underline">
                  <div>
                    <div className="font-medium">{(v as unknown as { branches: { name: string } }).branches?.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {v.visit_date} · {v.weighted_score_pct?.toFixed(0) ?? "—"}% weighted
                    </div>
                  </div>
                  <span className="rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
                    knockout
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {revisitDue.length ? (
        <Panel title="Revisits due">
          <ul className="divide-y">
            {revisitDue.map((v) => (
              <li key={v.id} className="table-row-hover first:-mt-0.5">
                <Link to="/visits/$visitId/report" params={{ visitId: v.id }} className="flex items-center justify-between gap-3 px-1 py-3 no-underline">
                  <div>
                    <div className="font-medium">{(v as unknown as { branches: { name: string } }).branches?.name}</div>
                    <div className="text-xs text-muted-foreground">{bandLabel[v.revisit_band as RevisitBand]}</div>
                  </div>
                  <span className="text-xs text-muted-foreground">{v.visit_date}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {staleBranches.length ? (
        <Panel title={`Not visited in ${DAYS_SINCE_THRESHOLD}+ days`}>
          <ul className="divide-y">
            {staleBranches.slice(0, 10).map((b) => (
              <li key={b.id} className="table-row-hover flex items-center justify-between px-1 py-3 first:-mt-0.5">
                <div>
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {b.emirate} · {b.branch_profile}
                  </div>
                </div>
                {canWrite ? (
                  <Link
                    to="/visits/new"
                    search={{ branch: b.id }}
                    className="text-xs font-medium text-primary transition-all hover:underline"
                  >
                    Start visit →
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel title="Recent visits">
        {recentVisits && recentVisits.length ? (
          <ul className="divide-y">
            {recentVisits.slice(0, 10).map((v) => (
              <li key={v.id} className="table-row-hover first:-mt-0.5">
                <Link
                  to={v.status === "completed" ? "/visits/$visitId/report" : "/visits/$visitId"}
                  params={{ visitId: v.id }}
                  className="flex items-center justify-between gap-3 px-1 py-3 no-underline"
                >
                  <div>
                    <div className="font-medium">{(v as unknown as { branches: { name: string } }).branches?.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {v.visit_date} · {v.status === "completed" ? `${v.weighted_score_pct?.toFixed(0) ?? "—"}% weighted` : "In progress"}
                    </div>
                  </div>
                  {v.red_flagged ? (
                    <span className="rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">knockout</span>
                  ) : v.status === "in_progress" ? (
                    <span className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">draft</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-sm text-muted-foreground">
            No visits yet. {canWrite ? (
              <Link to="/visits/new" className="text-primary hover:underline">Start your first visit.</Link>
            ) : "Ask a super admin to add branches and assign auditors."}
          </p>
        )}
      </Panel>
    </div>
  );
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone?: "danger" | "warning" }) {
  const [toneBg, toneIcon, toneText] = tone === "danger"
    ? ["bg-destructive/10", "text-destructive", "text-destructive"]
    : tone === "warning"
    ? ["bg-warning/10", "text-warning-foreground", "text-warning-foreground"]
    : ["bg-primary/10", "text-primary", "text-foreground"];
  return (
    <div className="card-elevated rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${toneBg} ${toneIcon}`}>
          {icon}
        </span>
        {label}
      </div>
      <div className={`mt-2 text-2xl font-bold ${toneText}`}>{value}</div>
    </div>
  );
}

function Panel({ title, tone, children }: { title: string; tone?: "danger"; children: React.ReactNode }) {
  return (
    <section className={`rounded-xl border bg-card p-5 shadow-xs ${tone === "danger" ? "border-destructive/30" : ""}`}>
      <div className={`mb-3 flex items-center gap-2 ${tone === "danger" ? "text-destructive" : "text-muted-foreground"}`}>
        {tone === "danger" ? (
          <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
        )}
        <h2 className="text-xs font-semibold uppercase tracking-widest">{title}</h2>
      </div>
      <div>{children}</div>
    </section>
  );
}
