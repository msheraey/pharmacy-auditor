import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { Plus, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { BranchProfile } from "@/lib/types";
import { InlineInput, InlineSelect } from "@/components/inline-edit";

export const Route = createFileRoute("/_authenticated/admin/branches")({
  ssr: false,
  component: BranchesAdmin,
});

type SortCol = "name" | "emirate" | "profile" | "active";
type SortDir = "asc" | "desc";

function BranchesAdmin() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const { data: branches } = useQuery({
    queryKey: ["admin-branches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    if (!branches) return [];
    const f = branches.filter((b) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return b.name.toLowerCase().includes(q) || b.emirate?.toLowerCase().includes(q) || b.branch_profile?.toLowerCase().includes(q);
    });
    f.sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "emirate": cmp = (a.emirate ?? "").localeCompare(b.emirate ?? ""); break;
        case "profile": cmp = (a.branch_profile ?? "").localeCompare(b.branch_profile ?? ""); break;
        case "active": cmp = Number(a.active) - Number(b.active); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return f;
  }, [branches, search, sortCol, sortDir]);

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  }

  function SortIcon({ col }: { col: SortCol }) {
    if (sortCol !== col) return <ArrowUpDown className="h-3 w-3" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} / {branches?.length ?? 0} branches</p>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" /> Add branch
        </button>
      </div>

      {showAdd ? (
        <BranchForm onDone={() => { setShowAdd(false); qc.invalidateQueries(); }} onCancel={() => setShowAdd(false)} />
      ) : null}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="Search branches…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">
                <button onClick={() => toggleSort("name")} className="inline-flex items-center gap-1 hover:text-foreground">
                  Name <SortIcon col="name" />
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button onClick={() => toggleSort("emirate")} className="inline-flex items-center gap-1 hover:text-foreground">
                  Emirate <SortIcon col="emirate" />
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button onClick={() => toggleSort("profile")} className="inline-flex items-center gap-1 hover:text-foreground">
                  Profile <SortIcon col="profile" />
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button onClick={() => toggleSort("active")} className="inline-flex items-center gap-1 hover:text-foreground">
                  Active <SortIcon col="active" />
                </button>
              </th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3 font-medium">
                  <InlineInput
                    value={b.name}
                    onSave={async (v) => { await supabase.from("branches").update({ name: v }).eq("id", b.id); qc.invalidateQueries(); }}
                  />
                </td>
                <td className="px-4 py-3">
                  <InlineSelect
                    value={b.emirate}
                    onSave={async (v) => { await supabase.from("branches").update({ emirate: v }).eq("id", b.id); qc.invalidateQueries(); }}
                    options={[
                      { value: "Dubai", label: "Dubai" },
                      { value: "Abu Dhabi", label: "Abu Dhabi" },
                      { value: "Sharjah", label: "Sharjah" },
                      { value: "Ras Al Khaimah", label: "Ras Al Khaimah" },
                    ]}
                  />
                </td>
                <td className="px-4 py-3">
                  <InlineSelect
                    value={b.branch_profile}
                    onSave={async (v) => { await supabase.from("branches").update({ branch_profile: v as BranchProfile }).eq("id", b.id); qc.invalidateQueries(); }}
                    options={[
                      { value: "Retail", label: "Retail" },
                      { value: "Delivery", label: "Delivery" },
                      { value: "Mixed", label: "Mixed" },
                      { value: "24-Hour", label: "24-Hour" },
                    ]}
                  />
                </td>
                <td className="px-4 py-3">
                  <ToggleActive id={b.id} active={b.active} onDone={() => qc.invalidateQueries()} />
                </td>
                <td className="px-4 py-3 text-right">
                  <DeleteBranch id={b.id} name={b.name} onDone={() => qc.invalidateQueries()} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BranchForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [emirate, setEmirate] = useState("");
  const [profile, setProfile] = useState<BranchProfile>("Retail");
  const [err, setErr] = useState("");

  const mut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("branches").insert({ name, emirate, branch_profile: profile });
      if (error) throw error;
    },
    onSuccess: onDone,
    onError: (e) => setErr((e as Error).message),
  });

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold">New branch</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <input placeholder="Branch name" value={name} onChange={(e) => setName(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring" />
        <select value={emirate} onChange={(e) => setEmirate(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring">
          <option value="">Select emirate</option>
          <option value="Dubai">Dubai</option>
          <option value="Abu Dhabi">Abu Dhabi</option>
          <option value="Sharjah">Sharjah</option>
          <option value="Ras Al Khaimah">Ras Al Khaimah</option>
        </select>
        <select value={profile} onChange={(e) => setProfile(e.target.value as BranchProfile)} className="h-9 rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring">
          <option value="Retail">Retail</option>
          <option value="Delivery">Delivery</option>
          <option value="Mixed">Mixed</option>
          <option value="24-Hour">24-Hour</option>
        </select>
      </div>
      {err ? <p className="text-xs text-destructive">{err}</p> : null}
      <div className="flex items-center gap-2">
        <button onClick={() => mut.mutate()} disabled={mut.isPending || !name || !emirate} className="h-9 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
          {mut.isPending ? "Adding…" : "Add branch"}
        </button>
        <button onClick={onCancel} className="h-9 rounded-md border border-input bg-background px-4 text-xs font-medium hover:bg-muted">Cancel</button>
      </div>
    </div>
  );
}

function ToggleActive({ id, active, onDone }: { id: string; active: boolean; onDone: () => void }) {
  const mut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("branches").update({ active: !active }).eq("id", id);
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

function DeleteBranch({ id, name, onDone }: { id: string; name: string; onDone: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const mut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("branches").delete().eq("id", id);
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
