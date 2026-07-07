import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, TrendingUp, User, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export const Route = createFileRoute("/_authenticated/staff/$staffId")({
  head: () => ({ meta: [{ title: "Staff Score Profile — Branch Auditor" }] }),
  component: StaffProfile,
});

function StaffProfile() {
  const { staffId } = Route.useParams();

  const { data: staff } = useQuery({
    queryKey: ["staff", staffId],
    queryFn: async () => {
      const { data } = await supabase.from("staff").select("*, branches(name)").eq("id", staffId).single();
      return data as any;
    },
  });

  const { data: scores } = useQuery({
    queryKey: ["staff-scores", staffId],
    queryFn: async () => {
      const { data } = await supabase.from("staff_scores").select("*").eq("staff_id", staffId).single();
      return data as any;
    },
  });

  const { data: audits } = useQuery({
    queryKey: ["staff-audit-history", staffId],
    queryFn: async () => {
      const { data } = await supabase
        .from("staff_audit_responses")
        .select("*, visits!inner(visit_date, branches!inner(name))")
        .eq("staff_id", staffId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: comments } = useQuery({
    queryKey: ["staff-comments", staffId],
    queryFn: async () => {
      const { data } = await supabase
        .from("staff_audit_responses")
        .select("score, comment, photo_url, created_at, visits!inner(visit_date, branches!inner(name)), checklist_points(point_text)")
        .eq("staff_id", staffId)
        .not("comment", "is", null)
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  if (!staff) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const scoreData = [];
  if (scores?.overall_score !== null) scoreData.push({ name: "Overall", value: scores.overall_score ?? 0 });
  if (scores?.operations_score !== null) scoreData.push({ name: "Operations", value: scores.operations_score ?? 0 });
  if (scores?.sales_customer_score !== null) scoreData.push({ name: "Sales & Customer", value: scores.sales_customer_score ?? 0 });
  if (scores?.clinical_knowledge_score !== null) scoreData.push({ name: "Clinical", value: scores.clinical_knowledge_score ?? 0 });

  const COLORS = ["#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"];

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center gap-2">
        <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary"><User className="h-5 w-5" /></div>
          <div>
            <h1 className="text-lg font-semibold">{staff.full_name}</h1>
            <p className="text-xs text-muted-foreground">{staff.staff_code} · {staff.role} · {staff.branches?.name ?? "No branch"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Overall</div>
          <div className="mt-1 text-2xl font-semibold">{scores?.overall_score !== null ? `${(scores?.overall_score ?? 0).toFixed(0)}%` : "—"}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Operations</div>
          <div className="mt-1 text-2xl font-semibold">{scores?.operations_score !== null ? `${(scores?.operations_score ?? 0).toFixed(0)}%` : "—"}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Sales & Customer</div>
          <div className="mt-1 text-2xl font-semibold">{scores?.sales_customer_score !== null ? `${(scores?.sales_customer_score ?? 0).toFixed(0)}%` : "—"}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Audits</div>
          <div className="mt-1 text-2xl font-semibold">{scores?.total_audits_count ?? 0}</div>
        </div>
      </div>

      {scoreData.length ? (
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold"><BarChart3 className="h-4 w-4" /> Score breakdown</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={scoreData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${v.toFixed(0)}%`} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {scoreData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {comments && comments.length ? (
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">Past audit comments</h2>
          <ul className="space-y-3">
            {comments.slice(0, 15).map((c: any, i: number) => (
              <li key={i} className="rounded-md border bg-background p-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-secondary px-1.5 py-0.5 font-medium">{c.score}</span>
                  <span className="text-muted-foreground">{c.visits?.branches?.name ?? "—"} · {c.visits?.visit_date}</span>
                </div>
                {c.checklist_points?.point_text ? <p className="mt-1 font-medium">{c.checklist_points.point_text}</p> : null}
                {c.comment ? <p className="mt-0.5 text-muted-foreground">"{c.comment}"</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
