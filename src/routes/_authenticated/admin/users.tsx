import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Plus, Trash2, ShieldAlert, Shield, Eye } from "lucide-react";
import type { AppRole } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersAdmin,
});

function UsersAdmin() {
  const qc = useQueryClient();
  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("id, user_id, role, cluster_id, clusters(name), users:auth_user_id(email)")
        .returns<(typeof data) & { clusters: { name: string } | null; users: { email: string } | null }[]>();
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: clusters } = useQuery({
    queryKey: ["clusters"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clusters").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const [showInvite, setShowInvite] = useState(false);

  const roleIcon = (role: AppRole) => {
    switch (role) {
      case "super_admin": return <ShieldAlert className="h-4 w-4 text-destructive" />;
      case "cluster_manager": return <Shield className="h-4 w-4 text-warning-foreground" />;
      case "viewer": return <Eye className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{users?.length ?? 0} role assignments</p>
        <button
          onClick={() => setShowInvite(true)}
          className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" /> Invite user
        </button>
      </div>

      {showInvite ? (
        <InviteForm clusters={clusters ?? []} onDone={() => { setShowInvite(false); qc.invalidateQueries(); }} onCancel={() => setShowInvite(false)} />
      ) : null}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Cluster scope</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users?.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium">{u.users?.email ?? u.user_id.slice(0, 8)}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1">
                    {roleIcon(u.role as AppRole)} {u.role.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.clusters?.name ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <DeleteRole id={u.id} onDone={() => qc.invalidateQueries()} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InviteForm({ clusters, onDone, onCancel }: { clusters: { id: string; name: string }[]; onDone: () => void; onCancel: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("viewer");
  const [clusterId, setClusterId] = useState("");
  const [err, setErr] = useState("");

  const mut = useMutation({
    mutationFn: async () => {
      const { data: user, error: signUpErr } = await supabase.auth.admin.createUser({
        email, password, email_confirm: true,
      });
      if (signUpErr) throw signUpErr;
      if (!user?.user) throw new Error("No user created");

      const { error: roleErr } = await supabase.from("user_roles").insert({
        user_id: user.user.id,
        role,
        cluster_id: clusterId || null,
      });
      if (roleErr) throw roleErr;
    },
    onSuccess: onDone,
    onError: (e) => setErr((e as Error).message),
  });

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold">Invite user</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring" />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring" />
        <select value={role} onChange={(e) => setRole(e.target.value as AppRole)} className="h-9 rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring">
          <option value="viewer">Viewer</option>
          <option value="cluster_manager">Cluster Manager</option>
          <option value="super_admin">Super Admin</option>
        </select>
        {role === "cluster_manager" ? (
          <select value={clusterId} onChange={(e) => setClusterId(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring">
            <option value="">No cluster scope</option>
            {clusters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        ) : <div />}
      </div>
      {err ? <p className="text-xs text-destructive">{err}</p> : null}
      <div className="flex items-center gap-2">
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending || !email || !password}
          className="h-9 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {mut.isPending ? "Creating…" : "Create & assign"}
        </button>
        <button onClick={onCancel} className="h-9 rounded-md border border-input bg-background px-4 text-xs font-medium hover:bg-muted">Cancel</button>
      </div>
    </div>
  );
}

function DeleteRole({ id, onDone }: { id: string; onDone: () => void }) {
  const mut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: onDone,
  });
  return (
    <button onClick={() => mut.mutate()} className="text-muted-foreground hover:text-destructive">
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
