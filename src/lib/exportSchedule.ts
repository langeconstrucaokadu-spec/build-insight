import ExcelJS from "exceljs";
import type { Database } from "@/integrations/supabase/types";

type Project = Database["public"]["Tables"]["construction_projects"]["Row"];
type Category = Database["public"]["Tables"]["project_categories"]["Row"];
type Subcategory = Database["public"]["Tables"]["project_subcategories"]["Row"];
type Item = Database["public"]["Tables"]["project_items"]["Row"];

const PINK = "FFC8175E";
const PINK_SOFT = "FFE8B4C8";
const GREY = "FFD9D9D9";
const YELLOW = "FFFFF2CC";
const GREEN_SOFT = "FFE2EFDA";
const HEADER_TEXT = "FFFFFFFF";

const fmtDate = (d?: string | null) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  return dt;
};
const diffDays = (a?: string | null, b?: string | null) => {
  if (!a || !b) return "";
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (isNaN(da) || isNaN(db)) return "";
  return Math.max(0, Math.round((db - da) / 86400000));
};
const minDate = (xs: (string | null | undefined)[]) => {
  const v = xs.filter(Boolean) as string[];
  return v.length ? v.reduce((a, b) => (a < b ? a : b)) : null;
};
const maxDate = (xs: (string | null | undefined)[]) => {
  const v = xs.filter(Boolean) as string[];
  return v.length ? v.reduce((a, b) => (a > b ? a : b)) : null;
};

const border = { style: "thin" as const, color: { argb: "FFBFBFBF" } };
const allBorders = { top: border, left: border, bottom: border, right: border };

// Gera link inteligente que força login no Portal do Cliente e redireciona à âncora
const portalLink = (projectId: string, anchor?: string) => {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const target = `/portal/obra/${projectId}${anchor ? `#${anchor}` : ""}`;
  return `${origin}/portal/login?redirect=${encodeURIComponent(target)}`;
};
const setHyperlink = (cell: ExcelJS.Cell, text: string, url: string) => {
  cell.value = { text, hyperlink: url, tooltip: "Requer login no Portal do Cliente" };
  cell.font = { ...(cell.font ?? {}), underline: true, color: { argb: "FF0563C1" } };
};

export async function exportScheduleXlsx(
  project: Project,
  categories: Category[],
  subcategories: Subcategory[],
  items: Item[],
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Lovable";
  wb.created = new Date();
  const ws = wb.addWorksheet("Cronograma", {
    views: [{ state: "frozen", ySplit: 8 }],
  });

  // Column widths: A item, B disciplina, C-E previsto, F-H real, I observações
  ws.columns = [
    { width: 8 },
    { width: 42 },
    { width: 12 },
    { width: 10 },
    { width: 12 },
    { width: 12 },
    { width: 10 },
    { width: 12 },
    { width: 60 },
  ];

  // ===== HEADER =====
  const setLabel = (cell: ExcelJS.Cell, text: string) => {
    cell.value = text;
    cell.font = { bold: true, color: { argb: PINK }, size: 11 };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = allBorders;
  };
  const setValue = (cell: ExcelJS.Cell, value: ExcelJS.CellValue, isDate = false) => {
    cell.value = value as ExcelJS.CellValue;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = allBorders;
    if (isDate) cell.numFmt = "dd/mm/yyyy";
  };

  // Linha 1: título
  ws.mergeCells("A1:I1");
  const title = ws.getCell("A1");
  title.value = "Núcleo de Obras e Infraestruturas";
  title.font = { bold: true, italic: true, size: 16, color: { argb: PINK } };
  title.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(1).height = 32;

  // Linha 2: Unidade / Data do preenchimento
  setLabel(ws.getCell("A2"), "UNIDADE:");
  ws.mergeCells("B2:C2");
  setValue(ws.getCell("B2"), project.unit ?? "");
  setLabel(ws.getCell("D2"), "DATA DO PREENCHIMENTO");
  ws.mergeCells("E2:F2");
  setValue(ws.getCell("E2"), fmtDate(project.filled_at), true);
  ws.mergeCells("G2:I2");
  setLabel(ws.getCell("G2"), "OBSERVAÇÕES E JUSTIFICATIVAS");
  ws.getCell("G2").alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  ws.getCell("G2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: PINK } };
  ws.getCell("G2").font = { bold: true, color: { argb: HEADER_TEXT } };

  // Linha 3: Obra / Data da atualização
  setLabel(ws.getCell("A3"), "OBRA:");
  ws.mergeCells("B3:C3");
  setValue(ws.getCell("B3"), project.name);
  // Link "Acompanhar Obra" exige login no Portal do Cliente
  setHyperlink(ws.getCell("B3"), project.name, portalLink(project.id));
  ws.getCell("B3").alignment = { vertical: "middle", horizontal: "center" };
  setLabel(ws.getCell("D3"), "DATA DA ATUALIZAÇÃO");
  ws.mergeCells("E3:F3");
  setValue(ws.getCell("E3"), fmtDate(project.last_activity_at), true);
  ws.mergeCells("G3:I6");
  const obsCell = ws.getCell("G3");
  obsCell.value = project.observation ?? "";
  obsCell.alignment = { vertical: "top", horizontal: "left", wrapText: true };
  obsCell.border = allBorders;

  // Linha 4: Empreiteiro (location) / Início estimado + Término estimado
  setLabel(ws.getCell("A4"), "EMPREITEIRO:");
  ws.mergeCells("B4:C4");
  setValue(ws.getCell("B4"), project.location ?? "");
  setLabel(ws.getCell("D4"), "INÍCIO ESTIMADO:");
  setValue(ws.getCell("E4"), fmtDate(project.start_date), true);
  setLabel(ws.getCell("F4"), "TÉRMINO ESTIMADO:");
  setValue(ws.getCell("G4"), fmtDate(project.estimated_delivery_date), true);

  // Início real / Término real (agregados dos itens)
  const actualStart = minDate(items.map((i) => i.actual_start_date));
  const actualEnd = maxDate(items.map((i) => i.actual_end_date));
  setLabel(ws.getCell("D5"), "INÍCIO REAL:");
  setValue(ws.getCell("E5"), fmtDate(actualStart), true);
  setLabel(ws.getCell("F5"), "TÉRMINO REAL:");
  setValue(ws.getCell("G5"), fmtDate(actualEnd), true);
  ws.mergeCells("A5:C6");
  ws.getCell("A5").border = allBorders;
  ws.mergeCells("D6:G6");

  // ===== Tabela: header row 7 e 8 =====
  ws.mergeCells("A7:A8");
  ws.mergeCells("B7:B8");
  ws.mergeCells("C7:E7");
  ws.mergeCells("F7:H7");
  ws.mergeCells("I7:I8");

  const headerStyle = (cell: ExcelJS.Cell, text: string, color: string) => {
    cell.value = text;
    cell.font = { bold: true, color: { argb: HEADER_TEXT } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
    cell.border = allBorders;
  };
  headerStyle(ws.getCell("A7"), "ITEM", PINK);
  headerStyle(ws.getCell("B7"), "DISCIPLINA", PINK);
  headerStyle(ws.getCell("C7"), "PREVISTO", "FFE8B419");
  headerStyle(ws.getCell("F7"), "REAL", "FF70AD47");
  headerStyle(ws.getCell("I7"), "OBSERVAÇÕES E JUSTIFICATIVAS", PINK);

  ["C8", "F8"].forEach((c) => headerStyle(ws.getCell(c), "INÍCIO", "FF7F7F7F"));
  ["D8", "G8"].forEach((c) => headerStyle(ws.getCell(c), "DURAÇÃO", "FF7F7F7F"));
  ["E8", "H8"].forEach((c) => headerStyle(ws.getCell(c), "TÉRMINO", "FF7F7F7F"));
  ws.getRow(7).height = 22;
  ws.getRow(8).height = 22;

  // ===== Conteúdo =====
  const sortedCats = [...categories].sort((a, b) => a.name.localeCompare(b.name, "pt"));
  let catIdx = 0;
  for (const cat of sortedCats) {
    catIdx++;
    const catItems = items.filter((i) => i.category_id === cat.id);
    if (!catItems.length && !subcategories.some((s) => s.category_id === cat.id)) continue;

    const catPlannedStart = minDate(catItems.map((i) => i.planned_start_date));
    const catPlannedEnd = maxDate(catItems.map((i) => i.planned_end_date));
    const catActualStart = minDate(catItems.map((i) => i.actual_start_date));
    const catActualEnd = maxDate(catItems.map((i) => i.actual_end_date));

    const catRow = ws.addRow([
      String(catIdx),
      cat.name.toUpperCase(),
      fmtDate(catPlannedStart),
      diffDays(catPlannedStart, catPlannedEnd),
      fmtDate(catPlannedEnd),
      fmtDate(catActualStart),
      diffDays(catActualStart, catActualEnd),
      fmtDate(catActualEnd),
      "",
    ]);
    catRow.eachCell((c) => {
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PINK } };
      c.font = { bold: true, color: { argb: HEADER_TEXT } };
      c.alignment = { vertical: "middle", horizontal: "center" };
      c.border = allBorders;
    });
    catRow.getCell(2).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    [3, 5, 6, 8].forEach((i) => (catRow.getCell(i).numFmt = "dd/mm/yyyy"));
    // Link para categoria
    {
      const c = catRow.getCell(2);
      c.value = { text: cat.name.toUpperCase(), hyperlink: portalLink(project.id, `cat-${cat.id}`), tooltip: "Abrir categoria (requer login)" };
      c.font = { bold: true, color: { argb: HEADER_TEXT }, underline: true };
    }

    const subs = subcategories.filter((s) => s.category_id === cat.id).sort((a, b) => a.name.localeCompare(b.name, "pt"));
    let subIdx = 0;

    const renderItems = (list: Item[]) => {
      const sorted = [...list].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0) || a.name.localeCompare(b.name, "pt"));
      for (const it of sorted) {
        const observation = [it.observation, it.delay_justification].filter(Boolean).join(" — ");
        const row = ws.addRow([
          "",
          it.name,
          fmtDate(it.planned_start_date),
          diffDays(it.planned_start_date, it.planned_end_date),
          fmtDate(it.planned_end_date),
          fmtDate(it.actual_start_date),
          diffDays(it.actual_start_date, it.actual_end_date),
          fmtDate(it.actual_end_date),
          observation,
        ]);
        row.eachCell((c) => {
          c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
          c.border = allBorders;
        });
        row.getCell(2).alignment = { vertical: "middle", horizontal: "left", indent: 2 };
        row.getCell(9).alignment = { vertical: "middle", horizontal: "left", wrapText: true };
        // Link para item
        {
          const c = row.getCell(2);
          c.value = { text: it.name, hyperlink: portalLink(project.id, `item-${it.id}`), tooltip: "Abrir item (requer login)" };
          c.font = { color: { argb: "FF0563C1" }, underline: true };
        }
        [3, 5].forEach((i) => {
          row.getCell(i).numFmt = "dd/mm/yyyy";
          row.getCell(i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: YELLOW } };
        });
        row.getCell(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: YELLOW } };
        [6, 8].forEach((i) => {
          row.getCell(i).numFmt = "dd/mm/yyyy";
          row.getCell(i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN_SOFT } };
        });
        row.getCell(7).fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN_SOFT } };
      }
    };

    // Itens sem subcategoria (direto na categoria)
    const directItems = catItems.filter((i) => !i.subcategory_id);
    renderItems(directItems);

    for (const sub of subs) {
      subIdx++;
      const subItems = catItems.filter((i) => i.subcategory_id === sub.id);
      const sPS = minDate(subItems.map((i) => i.planned_start_date));
      const sPE = maxDate(subItems.map((i) => i.planned_end_date));
      const sAS = minDate(subItems.map((i) => i.actual_start_date));
      const sAE = maxDate(subItems.map((i) => i.actual_end_date));
      const subRow = ws.addRow([
        `${catIdx}.${subIdx}`,
        sub.name.toUpperCase(),
        fmtDate(sPS),
        diffDays(sPS, sPE),
        fmtDate(sPE),
        fmtDate(sAS),
        diffDays(sAS, sAE),
        fmtDate(sAE),
        "",
      ]);
      subRow.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREY } };
        c.font = { bold: true };
        c.alignment = { vertical: "middle", horizontal: "center" };
        c.border = allBorders;
      });
      subRow.getCell(2).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      [3, 5, 6, 8].forEach((i) => (subRow.getCell(i).numFmt = "dd/mm/yyyy"));
      // Link para subcategoria
      {
        const c = subRow.getCell(2);
        c.value = { text: sub.name.toUpperCase(), hyperlink: portalLink(project.id, `sub-${sub.id}`), tooltip: "Abrir subcategoria (requer login)" };
        c.font = { bold: true, color: { argb: "FF0563C1" }, underline: true };
      }
      renderItems(subItems);
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = (project.name || "obra").replace(/[^\w\-]+/g, "_");
  a.download = `cronograma_${safeName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}