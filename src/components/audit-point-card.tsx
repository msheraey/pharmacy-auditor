import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/photo";
import { ScorePicker } from "./score-picker";
import { Camera, ChevronDown, ChevronUp, Info, ShieldAlert, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ResponseRow {
  score: number | null;
  is_na: boolean;
  comment: string | null;
  photo_url: string | null;
}

interface Props {
  pointId: string;
  pointText: string;
  measureText: string | null;
  knockout: boolean;
  disabled?: boolean;
  value?: ResponseRow;
  onSave: (patch: Partial<ResponseRow>) => Promise<void>;
  bucket: string; // "audit-evidence"
  userId: string;
  storagePathPrefix: string; // e.g. `visits/${visitId}` or `visits/${visitId}/staff/${staffId}`
}

export function AuditPointCard({
  pointId, pointText, measureText, knockout, disabled,
  value, onSave, bucket, userId, storagePathPrefix,
}: Props) {
  const [openMeasure, setOpenMeasure] = useState(false);
  const [comment, setComment] = useState(value?.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoSignedUrl, setPhotoSignedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentDebounce = useRef<number | null>(null);

  useEffect(() => setComment(value?.comment ?? ""), [value?.comment]);

  useEffect(() => {
    let cancelled = false;
    if (value?.photo_url) {
      supabase.storage.from(bucket).createSignedUrl(value.photo_url, 3600).then(({ data }) => {
        if (!cancelled) setPhotoSignedUrl(data?.signedUrl ?? null);
      });
    } else {
      setPhotoSignedUrl(null);
    }
    return () => { cancelled = true; };
  }, [value?.photo_url, bucket]);

  const currentScore: 1 | 2 | 3 | 4 | 5 | "na" | null = value?.is_na
    ? "na"
    : value?.score
      ? (value.score as 1 | 2 | 3 | 4 | 5)
      : null;

  const needsEvidence =
    !!value?.score && value.score <= 2 && !value.is_na &&
    !(value.comment && value.comment.trim().length) && !value.photo_url;

  const handleScore = async (v: 1 | 2 | 3 | 4 | 5 | "na" | null) => {
    if (disabled) return;
    setSaving(true);
    try {
      await onSave({
        score: v === "na" || v === null ? null : v,
        is_na: v === "na",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCommentChange = (v: string) => {
    setComment(v);
    if (commentDebounce.current) window.clearTimeout(commentDebounce.current);
    commentDebounce.current = window.setTimeout(() => {
      onSave({ comment: v.length ? v : null });
    }, 500);
  };

  const handlePhoto = async (file: File) => {
    setUploading(true);
    try {
      const blob = await compressImage(file);
      const path = `${storagePathPrefix}/${pointId}-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from(bucket).upload(path, blob, {
        contentType: "image/jpeg",
        upsert: true,
      });
      if (error) throw error;
      await onSave({ photo_url: path });
      void userId; // owner set automatically to auth.uid()
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    if (!value?.photo_url) return;
    await supabase.storage.from(bucket).remove([value.photo_url]);
    await onSave({ photo_url: null });
  };

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 space-y-3",
        needsEvidence && "border-warning",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {knockout ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-knockout px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-knockout-foreground">
                <ShieldAlert className="h-3 w-3" /> Knockout
              </span>
            ) : null}
            <h3 className="text-sm font-medium leading-snug">{pointText}</h3>
          </div>
          {measureText ? (
            <button
              type="button"
              onClick={() => setOpenMeasure((v) => !v)}
              className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Info className="h-3 w-3" /> How to measure
              {openMeasure ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          ) : null}
          {openMeasure && measureText ? (
            <p className="mt-1 rounded-md bg-muted/60 p-2 text-xs text-muted-foreground">{measureText}</p>
          ) : null}
        </div>
        {saving ? <span className="text-[10px] text-muted-foreground">saving…</span> : null}
      </div>

      <ScorePicker value={currentScore} onChange={handleScore} disabled={disabled} />

      <textarea
        placeholder="Comment (required for 1 or 2 without photo)"
        value={comment}
        disabled={disabled}
        onChange={(e) => handleCommentChange(e.target.value)}
        rows={2}
        className="w-full resize-y rounded-md border border-input bg-background p-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />

      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handlePhoto(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-muted disabled:opacity-50"
        >
          <Camera className="h-4 w-4" />
          {uploading ? "Uploading…" : value?.photo_url ? "Replace photo" : "Add photo"}
        </button>
        {value?.photo_url ? (
          <button
            type="button"
            onClick={removePhoto}
            className="inline-flex h-9 items-center gap-1 rounded-md border border-input bg-background px-2 text-xs text-destructive hover:bg-muted"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {photoSignedUrl ? (
          <a href={photoSignedUrl} target="_blank" rel="noreferrer" className="ml-auto">
            <img src={photoSignedUrl} alt="evidence" className="h-10 w-10 rounded-md object-cover" />
          </a>
        ) : null}
      </div>

      {needsEvidence ? (
        <p className="text-xs text-warning-foreground">
          A score of {value?.score} needs a photo or a comment before this visit can be completed.
        </p>
      ) : null}
    </div>
  );
}
