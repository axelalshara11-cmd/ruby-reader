import * as XLSX from "xlsx";
import type { ListItem, CardItem } from "@/types/card";

interface Row {
  "الترتيب": string | number;
  "التاريخ": string;
  "الإحداثيات": string;
  "المساحة": string;
  "رقم الإيصال": string;
  "المحصول": string;
}

export function buildWorkbook(items: ListItem[]): XLSX.WorkBook {
  const rows: Row[] = [];
  const separatorRowIndices: number[] = []; // 0-based within data rows
  let counter = 0;

  for (const item of items) {
    if (item.kind === "separator") {
      rows.push({
        "الترتيب": "",
        "التاريخ": `— ${item.text} —`,
        "الإحداثيات": "",
        "المساحة": "",
        "رقم الإيصال": "",
        "المحصول": "",
      });
      separatorRowIndices.push(rows.length - 1);
    } else {
      counter += 1;
      rows.push({
        "الترتيب": counter,
        "التاريخ": item.data.date || "",
        "الإحداثيات": item.data.coordinates || "",
        "المساحة": item.data.area || "",
        "رقم الإيصال": item.data.receiptNumber || "",
        "المحصول": item.data.crop || "",
      });
    }
  }

  const ws = XLSX.utils.json_to_sheet(rows, {
    header: ["الترتيب", "التاريخ", "الإحداثيات", "المساحة", "رقم الإيصال", "المحصول"],
  });

  // Column widths
  ws["!cols"] = [
    { wch: 8 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 22 },
    { wch: 12 },
  ];

  // RTL sheet view
  ws["!views"] = [{ RTL: true }];

  // Highlight separator rows: bold + background underline-style border on bottom
  for (const idx of separatorRowIndices) {
    const excelRow = idx + 2; // +1 header, +1 1-based
    const cols = ["A", "B", "C", "D", "E", "F"];
    for (const c of cols) {
      const ref = `${c}${excelRow}`;
      const cell = ws[ref];
      if (!cell) continue;
      cell.s = {
        font: { bold: true, color: { rgb: "064E3B" } },
        fill: { patternType: "solid", fgColor: { rgb: "D1FAE5" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          bottom: { style: "medium", color: { rgb: "064E3B" } },
          top: { style: "medium", color: { rgb: "064E3B" } },
        },
      };
    }
  }

  // Header style
  const headerCols = ["A1", "B1", "C1", "D1", "E1", "F1"];
  for (const ref of headerCols) {
    if (ws[ref]) {
      ws[ref].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { patternType: "solid", fgColor: { rgb: "064E3B" } },
        alignment: { horizontal: "center", vertical: "center" },
      };
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "الكارتات");
  // RTL on workbook
  if (!wb.Workbook) wb.Workbook = {} as any;
  (wb.Workbook as any).Views = [{ RTL: true }];
  return wb;
}

export function exportToBlob(items: ListItem[]): Blob {
  const wb = buildWorkbook(items);
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
  return new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function downloadXlsx(items: ListItem[], filename = "cards.xlsx") {
  const blob = exportToBlob(items);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function shareXlsx(items: ListItem[], filename = "cards.xlsx") {
  const blob = exportToBlob(items);
  const file = new File([blob], filename, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const navAny = navigator as any;

  // Try native Web Share API with file
  if (typeof navAny.share === "function") {
    try {
      const shareData: any = {
        files: [file],
        title: "مستخرج البيانات",
        text: "ملف بيانات الكارتات المستخرجة",
      };
      // Some browsers don't expose canShare but still support file sharing
      if (!navAny.canShare || navAny.canShare(shareData)) {
        await navAny.share(shareData);
        return { shared: true };
      }
    } catch (e: any) {
      if (e?.name === "AbortError") {
        return { shared: false, canceled: true };
      }
      console.warn("Web Share failed, falling back to download:", e);
    }
  }

  downloadXlsx(items, filename);
  return { shared: false };
}

/** Count only real cards (skip separators) */
export function countCards(items: ListItem[]): number {
  return items.filter((i) => i.kind === "card").length;
}
