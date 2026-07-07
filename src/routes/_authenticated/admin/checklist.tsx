import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, GripVertical, X, Check, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/checklist")({
  component: ChecklistAdmin,
});

function ChecklistAdmin() {
  const qc = useQueryClient();
  const { data: sections, isLoading } = useQuery({
    queryKey: ["admin-sections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("checklist_sections").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: points } = useQuery({
    queryKey: ["admin-points"],
    queryFn: async () => {
      const { data, error } = await supabase.from("checklist_points").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingPoint, setEditingPoint] = useState<string | null>(null);
  const [newSectionOpen, setNewSectionOpen] = useState(false);
  const [newPointForSection, setNewPointForSection] = useState<string | null>(null);

  const toggle = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{sections?.length ?? 0} sections · {points?.length ?? 0} points</p>
        <button
          onClick={() => setNewSectionOpen(true)}
          className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" /> Section
        </button>
      </div>

      {newSectionOpen ? (
        <SectionForm onDone={() => { setNewSectionOpen(false); qc.invalidateQueries(); }} onCancel={() => setNewSectionOpen(false)} />
      ) : null}

      <div className="space-y-2">
        {(sections ?? []).map((sec) => (
          <div key={sec.id} className="rounded-lg border bg-card">
            <div className="flex items-center gap-2 p-3">
              <button onClick={() => toggle(sec.id)} className="text-muted-foreground hover:text-foreground">
                {expanded.has(sec.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              {editingSection === sec.id ? (
                <SectionForm section={sec} onDone={() => { setEditingSection(null); qc.invalidateQueries(); }} onCancel={() => setEditingSection(null)} />
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-muted-foreground">{sec.code}</span>
                    <span className="ml-2 text-sm font-medium">{sec.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      w{sec.weight}× · {sec.scope}{sec.delivery_only ? " · delivery" : ""}{sec.active ? "" : " · inactive"}
                    </span>
                  </div>
                  <button onClick={() => setEditingSection(sec.id)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                  <DeleteBtn table="checklist_sections" id={sec.id} onDone={() => qc.invalidateQueries()} />
                </>
              )}
            </div>

            {expanded.has(sec.id) ? (
              <div className="border-t px-3 pb-3 pt-2">
                <div className="space-y-1">
                  {(points ?? []).filter((p) => p.section_id === sec.id).map((p) => (
                    <div key={p.id} className="flex items-start gap-2 rounded-md bg-muted/40 p-2">
                      {editingPoint === p.id ? (
                        <PointForm point={p} onDone={() => { setEditingPoint(null); qc.invalidateQueries(); }} onCancel={() => setEditingPoint(null)} />
                      ) : (
                        <>
                          <div className="min-w-0 flex-1 text-xs">
                            <span className="font-medium">{p.point_text}</span>
                            {p.measure_text ? <span className="ml-2 text-muted-foreground">— {p.measure_text}</span> : null}
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {p.knockout ? <span className="text-destructive font-medium">knockout · </span> : ""}
                              sort {p.sort_order}{p.active ? "" : " · inactive"}
                            </div>
                          </div>
                          <button onClick={() => setEditingPoint(p.id)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
                          <DeleteBtn table="checklist_points" id={p.id} onDone={() => qc.invalidateQueries()} />
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setNewPointForSection(sec.id)}
                  className="mt-2 inline-flex h-7 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-3 w-3" /> Add point
                </button>
                {newPointForSection === sec.id ? (
                  <PointForm sectionId={sec.id} onDone={() => { setNewPointForSection(null); qc.invalidateQueries(); }} onCancel={() => setNewPointForSection(null)} />
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionForm({ section, onDone, onCancel }: { section?: { id: string; code: string; name: string; scope: string; weight: number; delivery_only: boolean; active: boolean }; onDone: () => void; onCancel: () => void }) {
  const [code, setCode] = useState(section?.code ?? "");
  const [name, setName] = useState(section?.name ?? "");
  const [scope, setScope] = useState(section?.scope ?? "branch");
  const [weight, setWeight] = useState(String(section?.weight ?? 1));
  const [deliveryOnly, setDeliveryOnly] = useState(section?.delivery_only ?? false);
  const [active, setActive] = useState(section?.active ?? true);
  const [err, setErr] = useState("");

  const mut = useMutation({
    mutationFn: async () => {
      const payload = { code, name, scope, weight: Number(weight), delivery_only: deliveryOnly, active };
      if (section) {
        const { error } = await supabase.from("checklist_sections").update(payload).eq("id", section.id);
        if (error) throw error;
      } else {
        const { data } = await supabase.from("checklist_sections").select("max_sort").returns<{ max: number }[]>().maybeSingle();
        const { error } = await supabase.from("checklist_sections").insert({ ...payload, sort_order: (data as unknown as { max: number })?.max ?? 0 + 1 });
        if (error) throw error;
      }
    },
    onSuccess: onDone,
    onError: (e) => setErr((e as Error).message),
  });

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-md bg-muted/40 p-3 text-xs">
      <label className="space-y-1"><span className="text-muted-foreground">Code</span><input value={code} onChange={(e) => setCode(e.target.value)} className="h-8 w-16 rounded border bg-background px-2 outline-none" /></label>
      <label className="space-y-1 flex-1"><span className="text-muted-foreground">Name</span><input value={name} onChange={(e) => setName(e.target.value)} className="h-8 w-full rounded border bg-background px-2 outline-none" /></label>
      <label className="space-y-1"><span className="text-muted-foreground">Scope</span>
        <select value={scope} onChange={(e) => setScope(e.target.value)} className="h-8 rounded border bg-background px-2 outline-none">
          <option value="branch">branch</option><option value="staff">staff</option>
        </select>
      </label>
      <label className="space-y-1"><span className="text-muted-foreground">W</span>
        <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="h-8 w-14 rounded border bg-background px-2 outline-none" />
      </label>
      <label className="flex items-center gap-1"><input type="checkbox" checked={deliveryOnly} onChange={(e) => setDeliveryOnly(e.target.checked)} /> Delivery</label>
      <label className="flex items-center gap-1"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active</label>
      <div className="flex items-center gap-1">
        <button onClick={() => mut.mutate()} disabled={mut.isPending || !code} className="rounded bg-primary px-2 py-1 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"><Check className="h-3.5 w-3.5" /></button>
        <button onClick={onCancel} className="rounded bg-muted px-2 py-1 hover:bg-secondary"><X className="h-3.5 w-3.5" /></button>
      </div>
      {err ? <p className="w-full text-destructive">{err}</p> : null}
    </div>
  );
}

function PointForm({ point, sectionId, onDone, onCancel }: { point?: { id: string; point_text: string; measure_text: string | null; knockout: boolean; sort_order: number; active: boolean }; sectionId?: string; onDone: () => void; onCancel: () => void }) {
  const [text, setText] = useState(point?.point_text ?? "");
  const [measure, setMeasure] = useState(point?.measure_text ?? "");
  const [knockout, setKnockout] = useState(point?.knockout ?? false);
  const [active, setActive] = useState(point?.active ?? true);
  const [sort, setSort] = useState(String(point?.sort_order ?? 1));
  const [err, setErr] = useState("");

  const mut = useMutation({
    mutationFn: async () => {
      const payload = { point_text: text, measure_text: measure || null, knockout, sort_order: Number(sort), active };
      if (point) {
        const { error } = await supabase.from("checklist_points").update(payload).eq("id", point.id);
        if (error) throw error;
      } else if (sectionId) {
        const { error } = await supabase.from("checklist_points").insert({ ...payload, section_id: sectionId });
        if (error) throw error;
      }
    },
    onSuccess: onDone,
    onError: (e) => setErr((e as Error).message),
  });

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-md bg-muted/40 p-3 text-xs">
      <label className="space-y-1 flex-[2]"><span className="text-muted-foreground">Point</span><input value={text} onChange={(e) => setText(e.target.value)} className="h-8 w-full rounded border bg-background px-2 outline-none" /></label>
      <label className="space-y-1 flex-1"><span className="text-muted-foreground">Measure</span><input value={measure} onChange={(e) => setMeasure(e.target.value)} className="h-8 w-full rounded border bg-background px-2 outline-none" /></label>
      <label className="space-y-1"><span className="text-muted-foreground">Sort</span>
        <input type="number" value={sort} onChange={(e) => setSort(e.target.value)} className="h-8 w-14 rounded border bg-background px-2 outline-none" />
      </label>
      <label className="flex items-center gap-1"><input type="checkbox" checked={knockout} onChange={(e) => setKnockout(e.target.checked)} /> KO</label>
      <label className="flex items-center gap-1"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active</label>
      <div className="flex items-center gap-1">
        <button onClick={() => mut.mutate()} disabled={mut.isPending || !text} className="rounded bg-primary px-2 py-1 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"><Check className="h-3.5 w-3.5" /></button>
        <button onClick={onCancel} className="rounded bg-muted px-2 py-1 hover:bg-secondary"><X className="h-3.5 w-3.5" /></button>
      </div>
      {err ? <p className="w-full text-destructive">{err}</p> : null}
    </div>
  );
}

function DeleteBtn({ table, id, onDone }: { table: string; id: string; onDone: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const mut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from(table as "checklist_sections" | "checklist_points").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: onDone,
  });
  if (confirming) {
    return (
      <div className="flex items-center gap-1 text-xs">
        <AlertTriangle className="h-3 w-3 text-destructive" />
        <button onClick={() => mut.mutate()} className="text-destructive hover:underline">Confirm</button>
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
