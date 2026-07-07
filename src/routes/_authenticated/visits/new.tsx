import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useUserRoles, hasRole } from "@/lib/auth";
import { MapPin, Play } from "lucide-react";

const searchSchema = z.object({ branch: z.string().optional() });

export const Route = createFileRoute("/_authenticated/visits/new")({
  head: () => ({ meta: [{ title: "Start visit — Branch Auditor" }] }),
  validateSearch: (s) => searchSchema.parse(s),
  component: NewVisit,
});

function NewVisit() {
  const { user } = useSession();
  const { roles } = useUserRoles(user?.id);
  const canWrite = hasRole(roles, "super_admin") || hasRole(roles, "cluster_manager");
  const initialBranch = Route.useSearch().branch;
  const [branchId, setBranchId] = useState<string | undefined>(initialBranch);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const { data: branches } = useQuery({
    queryKey: ["branches-for-visit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("id, name, emirate, branch_profile, cluster_id")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const filtered = (branches ?? []).filter((b) =>
    q ? (b.name + " " + b.emirate).toLowerCase().includes(q.toLowerCase()) : true,
  );

  const startMut = useMutation({
    mutationFn: async () => {
      if (!branchId || !user) throw new Error("Pick a branch first");
      const now = new Date();
      const { data, error } = await supabase
        .from("visits")
        .insert({
          branch_id: branchId,
          auditor_user_id: user.id,
          visit_date: now.toISOString().slice(0, 10),
          visit_time: now.toTimeString().slice(0, 8),
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (visitId) => {
      navigate({ to: "/visits/$visitId", params: { visitId } });
    },
  });

  if (!canWrite) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        Your role can only view audits. Ask a super admin to give you cluster manager access.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Start a visit</h1>
        <p className="text-sm text-muted-foreground">
          Pick a branch. Date, time, and your auditor identity are stamped automatically.
        </p>
      </div>

      <input
        placeholder="Search branches…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />

      {filtered.length === 0 ? (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          No branches yet. A super admin must add branches before visits can start.
          <div className="mt-2 text-xs">
            (Insert rows into the <code>branches</code> table via Cloud → Database.)
          </div>
        </div>
      ) : (
        <ul className="grid gap-2">
          {filtered.map((b) => (
            <li key={b.id}>
              <button
                onClick={() => setBranchId(b.id)}
                className={`w-full rounded-lg border bg-card p-4 text-left transition ${
                  branchId === b.id ? "border-primary ring-2 ring-ring" : "hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{b.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {b.emirate} · {b.branch_profile}
                    </div>
                  </div>
                  {branchId === b.id ? <span className="text-xs font-medium text-primary">Selected</span> : null}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="sticky bottom-4 flex justify-end">
        <button
          disabled={!branchId || startMut.isPending}
          onClick={() => startMut.mutate()}
          className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg transition hover:opacity-90 disabled:opacity-50"
        >
          <Play className="h-4 w-4" /> {startMut.isPending ? "Starting…" : "Start visit"}
        </button>
      </div>
      {startMut.error ? <p className="text-xs text-destructive">{(startMut.error as Error).message}</p> : null}

      <Link to="/" className="inline-block text-xs text-muted-foreground hover:underline">← Cancel</Link>
    </div>
  );
}
