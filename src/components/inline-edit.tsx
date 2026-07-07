import { useState, useRef, useEffect } from "react";

interface InlineInputProps {
  value: string;
  onSave: (val: string) => Promise<void>;
  className?: string;
  placeholder?: string;
}

export function InlineInput({ value, onSave, className, placeholder }: InlineInputProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  const save = async () => {
    if (draft === value || saving) return;
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (editing)
    return (
      <input
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        className="h-7 w-full rounded border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
        placeholder={placeholder}
      />
    );

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      className={`cursor-pointer rounded px-1 -mx-1 hover:bg-muted/60 ${saving ? "opacity-50" : ""} ${className ?? ""}`}
      title="Click to edit"
    >
      {value || placeholder || "—"}
    </span>
  );
}

interface InlineSelectProps {
  value: string;
  onSave: (val: string) => Promise<void>;
  options: { value: string; label: string }[];
  className?: string;
}

export function InlineSelect({ value, onSave, options, className }: InlineSelectProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  const save = async () => {
    if (draft === value || saving) return;
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (editing)
    return (
      <select
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        className="h-7 rounded border border-input bg-background px-1 text-xs outline-none focus:ring-2 focus:ring-ring"
        autoFocus
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      className={`cursor-pointer rounded px-1 -mx-1 hover:bg-muted/60 ${saving ? "opacity-50" : ""} ${className ?? ""}`}
      title="Click to edit"
    >
      {(options.find((o) => o.value === value)?.label ?? value) || "—"}
    </span>
  );
}
