import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { StaffRole } from "@/lib/types";
import { InlineInput, InlineSelect } from "@/components/inline-edit";

export const Route = createFileRoute("/_authenticated/admin/staff")({
  ssr: false,
  component: StaffAdmin,
});

function StaffAdmin() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{staff?.length ?? 0} staff</p>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" /> Add staff
        </button>
      </div>

      {showAdd ? (
        <StaffForm onDone={() => { setShowAdd(false); qc.invalidateQueries(); }} onCancel={() => setShowAdd(false)} />
      ) : null}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Branch</th>
              <th className="px-4 py-3 text-left">DHA</th>
              <th className="px-4 py-3 text-left">Active</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {staff?.map((s) => (
              <tr key={s.id}>
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
                <td className="px-4 py-3 text-xs">
                  {s.dha_license_status ? (
                    <InlineInput
                      value={s.dha_license_status}
                      onSave={async (v) => { await supabase.from("staff").update({ dha_license_status: v || null }).eq("id", s.id); qc.invalidateQueries(); }}
                    />
                  ) : (
                    <InlineInput
                      value=""
                      placeholder="Add DHA"
                      onSave={async (v) => { await supabase.from("staff").update({ dha_license_status: v || null }).eq("id", s.id); qc.invalidateQueries(); }}
                    />
                  )}
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
    <button onClick={() => mut.mutate()} className={`text-xs font-medium ${active ? "text-success" : "text-muted-foreground"}`}>
      {active ? "Active" : "Inactive"}
    </button>
  );
}

function StaffForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<StaffRole>("Pharmacist");
  const [branchId, setBranchId] = useState("");
  const [dha, setDha] = useState("");
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
        dha_license_status: dha || null,
      });
      if (error) throw error;
    },
    onSuccess: onDone,
    onError: (e) => setErr((e as Error).message),
  });

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold">New staff</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <input placeholder="Code (digits only, e.g. 0021)" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="h-9 rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring" />
        <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring" />
        <select value={role} onChange={(e) => setRole(e.target.value as StaffRole)} className="h-9 rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring">
          <option value="Pharmacist">Pharmacist</option>
          <option value="Salesperson">Salesperson</option>
          <option value="Branch Manager">Branch Manager</option>
          <option value="Preparation">Preparation</option>
        </select>
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring">
          <option value="">No branch</option>
          {(branches ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <input placeholder="DHA license (optional)" value={dha} onChange={(e) => setDha(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring" />
      </div>
      {err ? <p className="text-xs text-destructive">{err}</p> : null}
      <div className="flex items-center gap-2">
        <button onClick={() => mut.mutate()} disabled={mut.isPending || !code || !name} className="h-9 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
          {mut.isPending ? "Adding…" : "Add staff"}
        </button>
        <button onClick={onCancel} className="h-9 rounded-md border border-input bg-background px-4 text-xs font-medium hover:bg-muted">Cancel</button>
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
      <div className="flex items-center justify-end gap-1 text-xs">
        <span className="text-muted-foreground">Delete {name}?</span>
        <button onClick={() => mut.mutate()} className="text-destructive hover:underline">Yes</button>
        <button onClick={() => setConfirming(false)} className="text-muted-foreground hover:underline">No</button>
      </div>
    );
  }
  return (
    <button onClick={() => setConfirming(true)} className="text-muted-foreground hover:text-destructive">
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
