import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { Plus, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { StaffRole } from "@/lib/types";
import { InlineInput, InlineSelect } from "@/components/inline-edit";

export const Route = createFileRoute("/_authenticated/admin/staff")({
  ssr: false,
  component: StaffAdmin,
});

type SortCol = "code" | "name" | "role" | "branch" | "active";
type SortDir = "asc" | "desc";

function StaffAdmin() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const { data: staff } = useQuery({
    queryKey: ["admin-staff"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("*, branches(name)")
        .order("full_name");
      if (error) throw error;
      return data as unknown as (typeof data) & { branches: { name: string } | null }[];
    },
  });

  const { data: branches } = useQuery({
    queryKey: ["branches-for-staff"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    if (!staff) return [];
    const f = staff.filter((s) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        s.staff_code.toLowerCase().includes(q) ||
        s.full_name.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q) ||
        s.branches?.name?.toLowerCase().includes(q)
      );
    });
    f.sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case "code": cmp = a.staff_code.localeCompare(b.staff_code); break;
        case "name": cmp = a.full_name.localeCompare(b.full_name); break;
        case "role": cmp = a.role.localeCompare(b.role); break;
        case "branch": cmp = (a.branches?.name ?? "").localeCompare(b.branches?.name ?? ""); break;
        case "active": cmp = Number(a.active) - Number(b.active); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return f;
  }, [staff, search, sortCol, sortDir]);

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  }

  function SortIcon({ col }: { col: SortCol }) {
    if (sortCol !== col) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} / {staff?.length ?? 0} staff</p>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground shadow-xs transition-all hover:opacity-90 active:scale-[0.97]"
        >
          <Plus className="h-3.5 w-3.5" /> Add staff
        </button>
      </div>

      {showAdd ? (
        <StaffForm onDone={() => { setShowAdd(false); qc.invalidateQueries(); }} onCancel={() => setShowAdd(false)} />
      ) : null}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
        <input
          placeholder="Search staff…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition-shadow focus:shadow-xs focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border shadow-xs">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/60">
              <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <button onClick={() => toggleSort("code")} className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
                  Code <SortIcon col="code" />
                </button>
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <button onClick={() => toggleSort("name")} className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
                  Name <SortIcon col="name" />
                </button>
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <button onClick={() => toggleSort("role")} className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
                  Role <SortIcon col="role" />
                </button>
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <button onClick={() => toggleSort("branch")} className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
                  Branch <SortIcon col="branch" />
                </button>
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <button onClick={() => toggleSort("active")} className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
                  Active <SortIcon col="active" />
                </button>
              </th>
              <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((s, i) => (
              <tr key={s.id} className={`table-row-hover ${i % 2 === 1 ? "bg-muted/20" : ""}`}>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  <InlineInput
                    value={s.staff_code}
                    onSave={async (v) => {
                      await supabase.from("staff").update({ staff_code: v }).eq("id", s.id);
                      qc.invalidateQueries();
                    }}
                  />
                </td>
                <td className="px-4 py-3 font-medium">
                  <InlineInput
                    value={s.full_name}
                    onSave={async (v) => { await supabase.from("staff").update({ full_name: v }).eq("id", s.id); qc.invalidateQueries(); }}
                  />
                </td>
                <td className="px-4 py-3">
                  <InlineSelect
                    value={s.role}
                    onSave={async (v) => { await supabase.from("staff").update({ role: v as StaffRole }).eq("id", s.id); qc.invalidateQueries(); }}
                    options={[
                      { value: "Pharmacist", label: "Pharmacist" },
                      { value: "Salesperson", label: "Salesperson" },
                      { value: "Branch Manager", label: "Branch Manager" },
                      { value: "Preparation", label: "Preparation" },
                    ]}
                  />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  <InlineSelect
                    value={s.branch_id ?? ""}
                    onSave={async (v) => {
                      await supabase.from("staff").update({ branch_id: v || null }).eq("id", s.id);
                      qc.invalidateQueries();
                    }}
                    options={[
                      { value: "", label: "—" },
                      ...(branches ?? []).map((b) => ({ value: b.id, label: b.name })),
                    ]}
                  />
                </td>
                <td className="px-4 py-3">
                  <ToggleActive id={s.id} active={s.active} onDone={() => qc.invalidateQueries()} />
                </td>
                <td className="px-4 py-3 text-right">
                  <DeleteStaff id={s.id} name={s.full_name} onDone={() => qc.invalidateQueries()} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ToggleActive({ id, active, onDone }: { id: string; active: boolean; onDone: () => void }) {
  const mut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("staff").update({ active: !active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: onDone,
  });
  return (
    <button onClick={() => mut.mutate()} className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${active ? "bg-success/10 text-success hover:bg-success/20" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-success" : "bg-muted-foreground/50"}`} />
      {active ? "Active" : "Inactive"}
    </button>
  );
}

function StaffForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<StaffRole>("Pharmacist");
  const [branchId, setBranchId] = useState("");
  const [err, setErr] = useState("");

  const { data: branches } = useQuery({
    queryKey: ["branches-for-staff"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("id, name").eq("active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const mut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("staff").insert({
        staff_code: code, full_name: name, role, branch_id: branchId || null,
      });
      if (error) throw error;
    },
    onSuccess: onDone,
    onError: (e) => setErr((e as Error).message),
  });

  return (
    <div className="rounded-xl border bg-card p-5 shadow-xs space-y-3">
      <h3 className="text-sm font-semibold">New staff</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <input placeholder="Code (digits only, e.g. 0021)" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="h-9 rounded-lg border border-input bg-background px-3 text-xs outline-none transition-shadow focus:shadow-xs focus:ring-2 focus:ring-ring" />
        <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-xs outline-none transition-shadow focus:shadow-xs focus:ring-2 focus:ring-ring" />
        <select value={role} onChange={(e) => setRole(e.target.value as StaffRole)} className="h-9 rounded-lg border border-input bg-background px-3 text-xs outline-none transition-shadow focus:shadow-xs focus:ring-2 focus:ring-ring">
          <option value="Pharmacist">Pharmacist</option>
          <option value="Salesperson">Salesperson</option>
          <option value="Branch Manager">Branch Manager</option>
          <option value="Preparation">Preparation</option>
        </select>
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-xs outline-none transition-shadow focus:shadow-xs focus:ring-2 focus:ring-ring">
          <option value="">No branch</option>
          {(branches ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
      {err ? <p className="text-xs text-destructive">{err}</p> : null}
      <div className="flex items-center gap-2">
        <button onClick={() => mut.mutate()} disabled={mut.isPending || !code || !name} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground shadow-xs transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100">
          {mut.isPending ? "Adding…" : "Add staff"}
        </button>
        <button onClick={onCancel} className="inline-flex h-9 items-center rounded-lg border border-input bg-background px-4 text-xs font-medium transition-all hover:bg-muted">Cancel</button>
      </div>
    </div>
  );
}

function DeleteStaff({ id, name, onDone }: { id: string; name: string; onDone: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const mut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("staff").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: onDone,
  });
  if (confirming) {
    return (
      <div className="flex items-center justify-end gap-1.5 text-xs">
        <span className="text-muted-foreground">Delete {name}?</span>
        <button onClick={() => mut.mutate()} className="font-medium text-destructive hover:underline">Yes</button>
        <button onClick={() => setConfirming(false)} className="font-medium text-muted-foreground hover:underline">No</button>
      </div>
    );
  }
  return (
    <button onClick={() => setConfirming(true)} className="rounded-md p-1.5 text-muted-foreground/60 transition-all hover:bg-destructive/10 hover:text-destructive">
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
