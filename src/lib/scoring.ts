// Pure scoring helpers used by the review + report screens.

import type { RevisitBand } from "@/lib/types";

export interface ScoredResponse {
  score: number | null;
  is_na: boolean;
  section_code: string;
  section_weight: number;
  knockout: boolean;
}

export interface ScoreBreakdown {
  raw_pct: number;
  weighted_pct: number;
  red_flagged: boolean;
  band: RevisitBand;
  section_pcts: Record<string, { pct: number; weight: number; count: number }>;
}

export function computeBranchScores(responses: ScoredResponse[]): ScoreBreakdown {
  const scored = responses.filter((r) => !r.is_na && r.score !== null);
  const totalPts = scored.reduce((a, r) => a + (r.score ?? 0), 0);
  const totalMax = scored.length * 5;
  const raw_pct = totalMax > 0 ? (totalPts / totalMax) * 100 : 0;

  const bySection: Record<string, { pts: number; max: number; weight: number; count: number }> = {};
  for (const r of scored) {
    const s = (bySection[r.section_code] ??= { pts: 0, max: 0, weight: r.section_weight, count: 0 });
    s.pts += r.score ?? 0;
    s.max += 5;
    s.count += 1;
  }
  let weightedSum = 0;
  let weightTotal = 0;
  const section_pcts: ScoreBreakdown["section_pcts"] = {};
  for (const [code, s] of Object.entries(bySection)) {
    const pct = s.max > 0 ? (s.pts / s.max) * 100 : 0;
    section_pcts[code] = { pct, weight: s.weight, count: s.count };
    weightedSum += pct * s.weight;
    weightTotal += s.weight;
  }
  const weighted_pct = weightTotal > 0 ? weightedSum / weightTotal : 0;

  const knockoutFail = responses.some((r) => r.knockout && !r.is_na && r.score === 1);
  const band: RevisitBand = knockoutFail || weighted_pct < 60
    ? "urgent_7d"
    : weighted_pct < 75
      ? "focused_30d"
      : weighted_pct < 90
        ? "action_plan"
        : "routine";

  return { raw_pct, weighted_pct, red_flagged: knockoutFail, band, section_pcts };
}

export const bandLabel: Record<RevisitBand, string> = {
  routine: "Routine — next visit per calendar",
  action_plan: "Action plan review in 2 weeks",
  focused_30d: "Revisit within 30 days (focused)",
  urgent_7d: "Urgent — revisit within 7 days",
};
