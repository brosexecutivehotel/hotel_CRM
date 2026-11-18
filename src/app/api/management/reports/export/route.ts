import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { requireDashboardRole } from "@/lib/auth/roles";
import { getReportsData, resolveReportParams, type ReportsData } from "@/features/management/reports/reports-data";

export const runtime = "nodejs";

function money(v: number) {
  return `USD ${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function spFromRequest(req: NextRequest): Record<string, string | string[]> {
  const sp: Record<string, string | string[]> = {};
  req.nextUrl.searchParams.forEach((_, key) => {
    const all = req.nextUrl.searchParams.getAll(key);
    sp[key] = all.length > 1 ? all : all[0] ?? "";
  });
  return sp;
}

function activeFiltersLabel(data: ReportsData): string {
  const parts: string[] = [];
  if (data.filters.resStatus.length) parts.push(`Res status: ${data.filters.resStatus.map(titleCase).join(", ")}`);
  if (data.filters.resSource.length) parts.push(`Res source: ${data.filters.resSource.join(", ")}`);
  if (data.filters.payStatus.length) parts.push(`Pay status: ${data.filters.payStatus.map(titleCase).join(", ")}`);
  if (data.filters.payMethod.length) parts.push(`Pay method: ${data.filters.payMethod.map((m) => titleCase(m.replace(/_/g, " "))).join(", ")}`);
  return parts.length ? parts.join(" | ") : "All categories";
}

async function buildXlsx(data: ReportsData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Bros Executive Hotel CRM";
  wb.created = new Date();
  const brandGold = "FFF4B900";
  const brandDark = "FF111111";
  const headerFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: brandGold } };
  const headerFont = { bold: true, color: { argb: brandDark } };

  const addMetaSheet = () => {
    const ws = wb.addWorksheet("Summary");
    ws.columns = [{ width: 28 }, { width: 22 }, { width: 28 }, { width: 22 }];
    ws.mergeCells("A1:D1");
    const title = ws.getCell("A1");
    title.value = "Bros Executive Hotel — Operational Report";
    title.font = { bold: true, size: 16, color: { argb: brandDark } };
    title.fill = headerFill;
    title.alignment = { vertical: "middle" };
    ws.getRow(1).height = 24;
    ws.getCell("A2").value = "Period";
    ws.getCell("B2").value = `${data.range.from} to ${data.range.to}`;
    ws.getCell("A3").value = "Filters";
    ws.getCell("B3").value = activeFiltersLabel(data);
    ws.getCell("A4").value = "Generated";
    ws.getCell("B4").value = new Date().toISOString();

    ws.addRow([]);
    ws.addRow(["Current Occupancy", "Value", "", ""]).font = headerFont;
    ws.addRow(["Occupancy %", `${data.rooms.occupancyPercent}%`]);
    ws.addRow(["Occupied", data.rooms.occupied]);
    ws.addRow(["Ready", data.rooms.ready]);
    ws.addRow(["Cleaning", data.rooms.cleaning]);
    ws.addRow(["Reserved", data.rooms.reserved]);
    ws.addRow(["Maintenance", data.rooms.maintenance]);
    ws.addRow(["Total rooms", data.rooms.total]);

    ws.addRow([]);
    ws.addRow(["Period Summary", "Value"]).font = headerFont;
    ws.addRow(["Arrivals", data.period.arrivals]);
    ws.addRow(["Departures", data.period.departures]);
    ws.addRow(["Revenue (paid)", money(data.period.revenuePaid)]);

    ws.addRow([]);
    ws.addRow(["Operations Snapshot", "Value"]).font = headerFont;
    ws.addRow(["Housekeeping pending", data.ops.housekeepingOpen]);
    ws.addRow(["Housekeeping in progress", data.ops.housekeepingInProgress]);
    ws.addRow(["Maintenance open", data.ops.maintenanceOpen]);
    ws.addRow(["Maintenance in progress", data.ops.maintenanceInProgress]);
    ws.addRow(["Low / reorder stock items", data.ops.lowStockItems]);
  };

  const addTable = (name: string, headers: string[], rows: (string | number)[][]) => {
    const ws = wb.addWorksheet(name);
    ws.columns = headers.map((h) => ({ header: h, key: h, width: Math.max(16, h.length + 4) }));
    const headerRow = ws.getRow(1);
    headerRow.font = headerFont;
    headerRow.fill = headerFill;
    headerRow.alignment = { vertical: "middle" };
    if (rows.length === 0) {
      ws.addRow(["No data for selected filters/period"]);
    } else {
      rows.forEach((r) => ws.addRow(r));
    }
  };

  addMetaSheet();
  addTable("Reservations by Status", ["Status", "Count"], data.period.reservationsByStatus.map((r) => [titleCase(r.status), r.count]));
  addTable("Reservations by Source", ["Source", "Count"], data.period.reservationsBySource.map((r) => [r.source, r.count]));
  addTable("Payments by Status", ["Status", "Count", "Total (USD)"], data.period.paymentsByStatus.map((r) => [titleCase(r.status), r.count, r.total]));
  addTable("Payments by Method", ["Method", "Count", "Total (USD)"], data.period.paymentsByMethod.map((r) => [titleCase(r.method), r.count, r.total]));

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}

function pdfBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

async function buildPdf(data: ReportsData): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const brandGold = "#f4b900";
  const brandDark = "#111111";
  const muted = "#6b7280";

  // Header
  doc.rect(0, 0, doc.page.width, 70).fill(brandDark);
  const logoPath = path.join(process.cwd(), "public", "brand", "bros-executive-logo.jpg");
  if (fs.existsSync(logoPath)) {
    try { doc.image(logoPath, 40, 12, { fit: [46, 46] }); } catch { /* ignore logo errors */ }
  }
  doc.fillColor(brandGold).fontSize(16).font("Helvetica-Bold").text("Bros Executive Hotel", 96, 18, { continued: false });
  doc.fillColor("#ffffff").fontSize(10).font("Helvetica").text("Operational Management Report", 96, 38);
  doc.fillColor(muted).fontSize(9).text(`Period: ${data.range.from} to ${data.range.to}`, doc.page.width - 240, 22, { width: 200, align: "right" });
  doc.text(`Generated: ${new Date().toLocaleString("en-GB")}`, doc.page.width - 240, 36, { width: 200, align: "right" });
  doc.y = 86;
  doc.fillColor(brandDark).fontSize(9).text(`Filters: ${activeFiltersLabel(data)}`, 40, doc.y, { width: doc.page.width - 80 });
  doc.moveDown(0.8);

  const section = (title: string) => {
    if (doc.y > 720) doc.addPage();
    doc.moveDown(0.4);
    doc.fillColor(brandGold).rect(40, doc.y, 4, 14).fill();
    doc.fillColor(brandDark).font("Helvetica-Bold").fontSize(12).text(title, 50, doc.y - 2);
    doc.moveDown(0.6);
  };

  const kv = (label: string, value: string) => {
    if (doc.y > 760) doc.addPage();
    doc.font("Helvetica").fontSize(10).fillColor(muted).text(label, 50, doc.y, { continued: true, width: 260 });
    doc.fillColor(brandDark).font("Helvetica-Bold").text(`  ${value}`);
  };

  section("Current Occupancy (Snapshot)");
  kv("Occupancy", `${data.rooms.occupancyPercent}% (${data.rooms.occupied}/${data.rooms.total})`);
  kv("Ready", String(data.rooms.ready));
  kv("Cleaning", String(data.rooms.cleaning));
  kv("Reserved", String(data.rooms.reserved));
  kv("Maintenance", String(data.rooms.maintenance));

  section("Period Summary");
  kv("Arrivals", String(data.period.arrivals));
  kv("Departures", String(data.period.departures));
  kv("Revenue (paid)", money(data.period.revenuePaid));

  const drawTable = (headers: string[], rows: string[][], widths: number[]) => {
    if (doc.y > 680) doc.addPage();
    const x = 50;
    let y = doc.y;
    const rowH = 18;
    doc.fillColor(brandGold).rect(x, y, widths.reduce((a, b) => a + b, 0), rowH).fill();
    doc.fillColor(brandDark).font("Helvetica-Bold").fontSize(9);
    let cx = x + 4;
    headers.forEach((h, i) => { doc.text(h, cx, y + 4, { width: widths[i] - 8 }); cx += widths[i]; });
    y += rowH;
    doc.font("Helvetica").fontSize(9).fillColor(brandDark);
    if (rows.length === 0) {
      doc.text("No data for selected filters/period", x + 4, y + 4);
      y += rowH;
    } else {
      for (const row of rows) {
        if (y > 760) { doc.addPage(); y = 60; }
        cx = x + 4;
        row.forEach((cell, i) => { doc.text(cell, cx, y + 4, { width: widths[i] - 8 }); cx += widths[i]; });
        doc.strokeColor("#e7e9ec").moveTo(x, y + rowH).lineTo(x + widths.reduce((a, b) => a + b, 0), y + rowH).stroke();
        y += rowH;
      }
    }
    doc.y = y + 6;
  };

  section("Reservations by Status");
  drawTable(["Status", "Count"], data.period.reservationsByStatus.map((r) => [titleCase(r.status), String(r.count)]), [260, 120]);
  section("Reservations by Source");
  drawTable(["Source", "Count"], data.period.reservationsBySource.map((r) => [r.source, String(r.count)]), [260, 120]);
  section("Payments by Status");
  drawTable(["Status", "Count", "Total"], data.period.paymentsByStatus.map((r) => [titleCase(r.status), String(r.count), money(r.total)]), [180, 90, 130]);
  section("Payments by Method");
  drawTable(["Method", "Count", "Total"], data.period.paymentsByMethod.map((r) => [titleCase(r.method), String(r.count), money(r.total)]), [180, 90, 130]);

  section("Operations Snapshot");
  kv("Housekeeping pending", String(data.ops.housekeepingOpen));
  kv("Housekeeping in progress", String(data.ops.housekeepingInProgress));
  kv("Maintenance open", String(data.ops.maintenanceOpen));
  kv("Maintenance in progress", String(data.ops.maintenanceInProgress));
  kv("Low / reorder stock items", String(data.ops.lowStockItems));

  // Footer on each page
  const pageRange = doc.bufferedPageRange();
  for (let i = 0; i < pageRange.count; i++) {
    doc.switchToPage(i);
    doc.fillColor(muted).fontSize(8).font("Helvetica").text(
      `Bros Executive Hotel · Confidential Executive Report · Page ${i + 1} of ${pageRange.count}`,
      40,
      doc.page.height - 30,
      { width: doc.page.width - 80, align: "center" },
    );
  }

  return pdfBuffer(doc);
}

export async function GET(req: NextRequest) {
  await requireDashboardRole("management");
  const sp = spFromRequest(req);
  const format = (Array.isArray(sp.format) ? sp.format[0] : sp.format) || "pdf";
  const params = resolveReportParams(sp);
  const data = await getReportsData(params);
  const stamp = `${data.range.from}_to_${data.range.to}`;

  if (format === "xlsx" || format === "excel") {
    const buf = await buildXlsx(data);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="bros-executive-report-${stamp}.xlsx"`,
      },
    });
  }

  const buf = await buildPdf(data);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="bros-executive-report-${stamp}.pdf"`,
    },
  });
}
