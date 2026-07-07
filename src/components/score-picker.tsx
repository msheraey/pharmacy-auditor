// Shared score pill button used on branch + staff audit screens.
import { cn } from "@/lib/utils";

type Score = 1 | 2 | 3 | 4 | 5 | "na";

interface Props {
  value: Score | null;
  onChange: (v: Score | null) => void;
  disabled?: boolean;
}

const OPTIONS: Score[] = [5, 4, 3, 2, 1, "na"];

export function ScorePicker({ value, onChange, disabled }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((opt) => {
        const selected = value === opt;
        const label = opt === "na" ? "N/A" : String(opt);
        const selectedClass = selected
          ? opt === "na"
            ? "score-pill-selected-na"
            : `score-pill-selected-${opt}`
          : "";
        return (
          <button
            key={label}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onChange(selected ? null : opt)}
            className={cn("score-pill", selectedClass, "disabled:opacity-50")}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export const SCORE_ANCHORS = [
  { s: 5, t: "Excellent — exceeds standard, showcase-level" },
  { s: 4, t: "Good — meets standard fully, minor cosmetic gaps" },
  { s: 3, t: "Acceptable — meets standard with noticeable gaps, no risk" },
  { s: 2, t: "Below standard — corrective action within 7 days" },
  { s: 1, t: "Critical — compliance/safety risk or customer-impacting failure" },
  { s: "N/A", t: "Not applicable to this branch/role (excluded from denominator)" },
];
