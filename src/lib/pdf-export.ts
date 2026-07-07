import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import type { Staff, RevisitBand } from "@/lib/types";
import { bandLabel } from "@/lib/scoring";

const INDENT = 14;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - INDENT * 2;
const COLORS = {
  primary: [41, 98, 255],
  success: [34, 197, 94],
  warning: [234, 179, 8],
  destructive: [239, 68, 68],
  muted: [150, 150, 150],
  bg: [245, 245, 245],
  border: [220, 220, 220],
};

function c(c: number[]): [number, number, number] {
  return [c[0], c[1], c[2]];
}

function setTextC(doc: jsPDF, color: number[]) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function setFillC(doc: jsPDF, color: number[]) {
  doc.setFillColor(color[0], color[1], color[2]);
}

function setDrawC(doc: jsPDF, color: number[]) {
  doc.setDrawColor(color[0], color[1], color[2]);
}

async function fetchImageBase64(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function addFooter(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    setTextC(doc, COLORS.muted);
    doc.text(
      `Generated ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} · Page ${i} of ${pages}`,
      INDENT,
      286,
    );
  }
}

function drawScoreCard(doc: jsPDF, x: number, y: number, label: string, value: string, color?: number[]) {
  const w = 58;
  const h = 28;
  const r2 = 4;

  if (color) {
    setFillC(doc, color);
    doc.setTextColor(255, 255, 255);
  } else {
    setFillC(doc, [255, 255, 255]);
    setDrawC(doc, COLORS.border);
    doc.setTextColor(0, 0, 0);
  }

  doc.roundedRect(x, y, w, h, r2, r2, color ? "F" : "FD");

  doc.setFontSize(7);
  doc.text(label.toUpperCase(), x + w / 2, y + 10, { align: "center" });
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(value, x + w / 2, y + 22, { align: "center" });
  doc.setFont("helvetica", "normal");
}

function drawSectionDivider(doc: jsPDF, y: number, label: string) {
  setDrawC(doc, COLORS.border);
  doc.line(INDENT, y, PAGE_WIDTH - INDENT, y);
  doc.setFontSize(9);
  setTextC(doc, COLORS.muted);
  doc.text(label.toUpperCase(), INDENT, y - 2);
}

interface ExportData {
  visit: any;
  sectionRows: { code: string; name: string; pct: number; weight: number }[];
  evidence: any[];
  allPoints: any[];
  allSections: any[];
  staffAgg: Map<string, { pts: number; max: number }>;
  allStaff: Staff[];
  actionItems: any[];
  branchResp: any[];
}

export async function exportPDF(data: ExportData) {
  const { visit, sectionRows, evidence, allPoints, allSections, staffAgg, allStaff, actionItems, branchResp } = data;
  const doc = new jsPDF();
  const pm = new Map(allPoints.map((p: any) => [p.id, p]));
  const sm = new Map(allSections.map((s: any) => [s.id, s]));
  let y = INDENT;

  // ── PAGE 1: COVER ──
  doc.setFontSize(22);
  setTextC(doc, COLORS.primary);
  doc.setFont("helvetica", "bold");
  doc.text("BRANCH AUDIT REPORT", INDENT, y);
  y += 10;

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  doc.setFont("helvetica", "bold");
  doc.text("Branch: ", INDENT, y);
  doc.setFont("helvetica", "normal");
  doc.text(visit.branches.name, INDENT + doc.getTextWidth("Branch: "), y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Emirate: ", INDENT, y);
  doc.setFont("helvetica", "normal");
  doc.text(visit.branches.emirate, INDENT + doc.getTextWidth("Emirate: "), y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Profile: ", INDENT, y);
  doc.setFont("helvetica", "normal");
  doc.text(visit.branches.branch_profile, INDENT + doc.getTextWidth("Profile: "), y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Date: ", INDENT, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${visit.visit_date} at ${visit.visit_time.slice(0, 5)}`, INDENT + doc.getTextWidth("Date: "), y);
  y += 14;

  const band = visit.revisit_band as RevisitBand | null;
  const redFlagged = visit.red_flagged;

  drawScoreCard(doc, INDENT, y, "Raw Score", visit.branch_score_pct !== null ? `${visit.branch_score_pct.toFixed(0)}%` : "—");
  drawScoreCard(doc, INDENT + 63, y, "Weighted Score", visit.weighted_score_pct !== null ? `${visit.weighted_score_pct.toFixed(0)}%` : "—", COLORS.primary);
  drawScoreCard(doc, INDENT + 126, y, "People Index", visit.people_index_pct !== null ? `${visit.people_index_pct.toFixed(0)}%` : "—");
  y += 36;

  if (band) {
    y += 4;
    doc.setFillColor(redFlagged ? 255 : 245, redFlagged ? 240 : 245, redFlagged ? 240 : 245);
    const dc = redFlagged ? COLORS.destructive : COLORS.border;
    doc.setDrawColor(dc[0], dc[1], dc[2]);
    doc.roundedRect(INDENT, y, CONTENT_WIDTH, redFlagged ? 28 : 20, 3, 3, "FD");
    if (redFlagged) {
      doc.setFontSize(10);
      setTextC(doc, COLORS.destructive);
      doc.setFont("helvetica", "bold");
      doc.text("KNOCKOUT FAILURE — VISIT RED-FLAGGED", INDENT + 4, y + 8);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text("A knockout point scored 1. Escalate to operations and revisit within 7 days.", INDENT + 4, y + 16);
      doc.text(`Revisit band: ${bandLabel[band]}`, INDENT + 4, y + 22);
    } else {
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text("Revisit Band", INDENT + 4, y + 8);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text(bandLabel[band], INDENT + 4, y + 15);
    }
    y += redFlagged ? 36 : 28;
  }

  // ── SECTION BREAKDOWN TABLE ──
  y += 6;
  drawSectionDivider(doc, y, "Section Breakdown");
  y += 6;

  const sectionBody = sectionRows.map((s) => [
    s.code,
    s.name,
    { content: `${s.pct.toFixed(0)}%`, styles: { halign: "center" as const } },
    { content: `${s.weight}×`, styles: { halign: "center" as const } },
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Code", "Section", "Score %", "Weight"]],
    body: sectionBody,
    theme: "grid",
    headStyles: {
      fillColor: c(COLORS.primary),
      fontSize: 8,
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 16, halign: "center" },
      1: { cellWidth: 100 },
      2: { cellWidth: 30, halign: "center" },
      3: { cellWidth: 20, halign: "center" },
    },
    margin: { left: INDENT, right: INDENT },
    tableWidth: CONTENT_WIDTH,
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── PER-POINT DETAILED SCORING ──
  if (branchResp.length > 0) {
    drawSectionDivider(doc, y, "Detailed Point Scoring");
    y += 6;

    const sortedSections = [...new Set(branchResp
      .map((r: any) => pm.get(r.checklist_point_id)?.section_id)
      .filter(Boolean))];

    for (const sectionId of sortedSections) {
      const sec = sm.get(sectionId);
      if (!sec) continue;

      y += 2;
      doc.setFontSize(9);
      setTextC(doc, COLORS.primary);
      doc.setFont("helvetica", "bold");
      doc.text(`${sec.code} — ${sec.name}`, INDENT, y);
      y += 4;

      const respBody = branchResp
        .filter((r: any) => {
          const p2 = pm.get(r.checklist_point_id);
          return p2 && p2.section_id === sectionId;
        })
        .map((r: any) => {
          const p2 = pm.get(r.checklist_point_id);
          const scoreLabel = r.is_na ? "N/A" : r.score !== null ? `${r.score}/5` : "—";
          const flag = p2?.knockout ? " ⚑" : "";
          return [
            `${p2?.point_text ?? ""}${flag}`,
            p2?.measure_text ?? "",
            { content: scoreLabel, styles: { halign: "center" as const } },
            r.comment || "",
          ];
        });

      if (respBody.length === 0) continue;

      autoTable(doc, {
        startY: y,
        head: [["Point", "How to Score / Measure", "Score", "Comment"]],
        body: respBody,
        theme: "grid",
        headStyles: {
          fillColor: c(COLORS.primary),
          fontSize: 7,
          fontStyle: "bold",
        },
        bodyStyles: { fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 55 },
          1: { cellWidth: 65 },
          2: { cellWidth: 14, halign: "center" },
          3: { cellWidth: 35 },
        },
        margin: { left: INDENT, right: INDENT },
        tableWidth: CONTENT_WIDTH,
      });

      y = (doc as any).lastAutoTable.finalY + 4;

      if (y > 250) {
        doc.addPage();
        y = INDENT;
      }
    }
  }

  // ── STAFF SCORES ──
  if (doc.getNumberOfPages() > 1) doc.addPage();
  else if (y > 230) doc.addPage();
  y = y > 230 ? INDENT : y + 4;

  drawSectionDivider(doc, y, "Staff Scores");
  y += 6;

  if (staffAgg.size === 0) {
    doc.setFontSize(8);
    setTextC(doc, COLORS.muted);
    doc.text("No staff members were audited during this visit.", INDENT, y);
    y += 8;
  } else {
    const staffBody = [...staffAgg.entries()].map(([sid, agg]) => {
      const s = allStaff.find((x) => x.id === sid);
      const pct = agg.max ? (agg.pts / agg.max) * 100 : 0;
      return [
        s?.full_name ?? "Unknown",
        s?.staff_code ?? "",
        s?.role ?? "",
        { content: `${pct.toFixed(0)}%`, styles: { halign: "center" as const } },
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [["Name", "Staff Code", "Role", "Score %"]],
      body: staffBody,
      theme: "grid",
      headStyles: { fillColor: c(COLORS.primary), fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 35, halign: "center" },
        2: { cellWidth: 35, halign: "center" },
        3: { cellWidth: 25, halign: "center" },
      },
      margin: { left: INDENT, right: INDENT },
      tableWidth: CONTENT_WIDTH,
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── EVIDENCE APPENDIX ──
  if (evidence.length > 0) {
    if (y > 220) { doc.addPage(); y = INDENT; }

    drawSectionDivider(doc, y, "Evidence Appendix");
    y += 6;

    const photoMap = new Map<string, string | null>();
    const photoPromises = evidence
      .filter((r: any) => r.photo_url)
      .map(async (r: any) => {
        const { data } = await supabase.storage.from("audit-evidence").createSignedUrl(r.photo_url, 3600);
        if (data?.signedUrl) {
          const b64 = await fetchImageBase64(data.signedUrl);
          photoMap.set(r.id, b64);
        }
      });

    if (photoPromises.length > 0) {
      await Promise.all(photoPromises);
    }

    for (const r of evidence) {
      const p = pm.get(r.checklist_point_id);
      const sec = p ? sm.get(p.section_id) : null;

      if (y > 250) { doc.addPage(); y = INDENT; }

      doc.setFillColor(248, 248, 248);
      setDrawC(doc, COLORS.border);
      doc.roundedRect(INDENT, y, CONTENT_WIDTH, 1, 1, "F" as any);

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      setTextC(doc, COLORS.primary);
      doc.text(sec?.code ?? "", INDENT + 3, y + 5);
      doc.setTextColor(0, 0, 0);
      doc.text("Score: ", INDENT + 20, y + 5);
      doc.setFont("helvetica", "bold");

      if (r.score !== null) {
        const sc = r.score <= 2 ? COLORS.destructive : r.score === 3 ? COLORS.warning : COLORS.success;
        doc.setTextColor(sc[0], sc[1], sc[2]);
      }
      doc.text(r.score !== null ? `${r.score}/5` : "—", INDENT + 35, y + 5);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");

      y += 8;
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(p?.point_text ?? "", INDENT + 3, y);
      doc.setFont("helvetica", "normal");
      y += 5;

      if (r.comment) {
        doc.setTextColor(60, 60, 60);
        doc.text(`"${r.comment}"`, INDENT + 6, y);
        doc.setTextColor(0, 0, 0);
        y += 5;
      }

      const photoB64 = photoMap.get(r.id);
      if (photoB64) {
        try {
          doc.addImage(photoB64, "JPEG", INDENT + 3, y, 55, 0);
          y += 42;
        } catch {
          y += 3;
        }
      } else {
        y += 3;
      }

      y += 4;
    }
  }

  // ── ACTION ITEMS ──
  if (actionItems.length > 0) {
    if (y > 220) { doc.addPage(); y = INDENT; }

    drawSectionDivider(doc, y, "Action Items");
    y += 6;

    const actionBody = actionItems.map((a: any) => [
      a.description,
      a.checklist_points?.point_text ?? "",
      {
        content: a.status.toUpperCase(),
        styles: {
          halign: "center" as const,
          fontStyle: "bold",
          textColor: c(a.status === "overdue" ? COLORS.destructive : a.status === "done" ? COLORS.success : COLORS.primary),
        },
      },
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Description", "Related Point", "Status"]],
      body: actionBody,
      theme: "grid",
      headStyles: { fillColor: c(COLORS.primary), fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 65 },
        2: { cellWidth: 25, halign: "center" },
      },
      margin: { left: INDENT, right: INDENT },
      tableWidth: CONTENT_WIDTH,
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  addFooter(doc);

  const branchName = (visit.branches as any)?.name ?? "branch";
  doc.save(`${branchName}_${visit.visit_date}_audit_report.pdf`);
}
