import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import * as xlsx from "xlsx";
import { hasSession } from "@/lib/auth";
import { isOneOf, MOUNT_TYPES } from "@/lib/enums";

// Only include fields that are actually in our Prisma schema
const COMPONENT_FIELDS = new Set([
  "id", "name", "category", "subcategory", "part_number", "value",
  "approximate_cost", "current_quantity", "unit", "location",
  "min_stock", "description", "notes", "image_url",
]);

const WISHLIST_FIELDS = new Set([
  "id", "name", "category", "quantity", "priority", "estimated_price",
  "store", "url", "reason", "status",
]);

const PROJECT_FIELDS = new Set(["id", "name", "description"]);

const LOAN_FIELDS = new Set([
  "id", "component_id", "quantity", "person", "loan_date",
  "expected_return_date", "actual_return_date", "status", "notes",
]);

const MOVEMENT_FIELDS = new Set(["id", "component_id", "type", "quantity", "date", "notes"]);

function pick(obj: any, allowed: Set<string>) {
  const out: any = {};
  for (const key of allowed) {
    if (key in obj && obj[key] !== undefined && obj[key] !== "") {
      out[key] = obj[key];
    }
  }
  return out;
}

function toStrOrNull(v: any): string | null {
  if (v === null || v === undefined || v === "") return null;
  return String(v).trim() || null;
}

function sanitizeComponent(row: any) {
  return {
    id: toStrOrNull(row.id)!,
    name: toStrOrNull(row.name)!,
    category: toStrOrNull(row.category) ?? "Sin Categoría",
    subcategory: toStrOrNull(row.subcategory),
    part_number: toStrOrNull(row.part_number),
    value: toStrOrNull(row.value),
    approximate_cost: row.approximate_cost != null ? parseFloat(row.approximate_cost) || null : null,
    current_quantity: parseInt(row.current_quantity) || 0,
    unit: toStrOrNull(row.unit) ?? "uds",
    location: toStrOrNull(row.location),
    min_stock: parseInt(row.min_stock) || 0,
    description: toStrOrNull(row.description),
    notes: toStrOrNull(row.notes),
    image_url: toStrOrNull(row.image_url),
    datasheet_url: toStrOrNull(row.datasheet_url),
    mount_type: isOneOf(MOUNT_TYPES, row.mount_type) ? row.mount_type : null,
    package_type: toStrOrNull(row.package_type),
    manufacturer: toStrOrNull(row.manufacturer),
    barcode: toStrOrNull(row.barcode),
    auto_reorder: row.auto_reorder === undefined ? true : String(row.auto_reorder).toLowerCase() !== "false",
    reorder_qty: row.reorder_qty != null && row.reorder_qty !== "" ? parseInt(row.reorder_qty) || null : null,
  };
}

export async function POST(req: NextRequest) {
  // Antes era público: cualquiera podía sobrescribir el inventario.
  if (!(await hasSession())) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ success: false, error: "No se proporcionó ningún archivo." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let wb: xlsx.WorkBook;
    try {
      wb = xlsx.read(buffer, { type: "buffer", cellDates: true });
    } catch (e) {
      return NextResponse.json(
        { success: false, error: "El archivo no se pudo leer. Asegúrate que sea un .xlsx válido." },
        { status: 400 }
      );
    }

    let importedCount = 0;
    const errors: string[] = [];

    // ── Components ───────────────────────────────────────────────
    const compsSheetName = wb.SheetNames.includes("Componentes")
      ? "Componentes"
      : wb.SheetNames[0];
    const compsSheet = wb.Sheets[compsSheetName];

    if (compsSheet) {
      const rows = xlsx.utils.sheet_to_json(compsSheet);
      for (const row of rows as any[]) {
        if (!row.id || !row.name) continue;
        try {
          const data = sanitizeComponent(row);
          await prisma.component.upsert({
            where: { id: data.id },
            update: data,
            create: data,
          });
          importedCount++;
        } catch (err: any) {
          errors.push(`Componente "${row.name}": ${err.message}`);
        }
      }
    }

    // ── Wishlist ─────────────────────────────────────────────────
    const wlSheet = wb.Sheets["Wishlist"];
    if (wlSheet) {
      const rows = xlsx.utils.sheet_to_json(wlSheet);
      for (const row of rows as any[]) {
        if (!row.id) continue;
        try {
          const data: any = pick(row, WISHLIST_FIELDS);
          data.id = String(row.id);
          data.name = toStrOrNull(row.name) ?? "Sin nombre";
          data.category = toStrOrNull(row.category) ?? "Sin Categoría";
          data.quantity = parseInt(row.quantity) || 1;
          data.priority = toStrOrNull(row.priority) ?? "MEDIA";
          data.status = toStrOrNull(row.status) ?? "PENDIENTE";
          if (data.estimated_price != null) data.estimated_price = parseFloat(data.estimated_price) || null;
          await prisma.wishlistItem.upsert({ where: { id: data.id }, update: data, create: data });
        } catch (err: any) {
          errors.push(`Wishlist ${row.id}: ${err.message}`);
        }
      }
    }

    // ── Projects ─────────────────────────────────────────────────
    const projSheet = wb.Sheets["Proyectos"];
    if (projSheet) {
      const rows = xlsx.utils.sheet_to_json(projSheet);
      for (const row of rows as any[]) {
        if (!row.id) continue;
        try {
          const data: any = {
            id: String(row.id),
            name: toStrOrNull(row.name) ?? "Sin nombre",
            description: toStrOrNull(row.description),
          };
          await (prisma as any).project.upsert({ where: { id: data.id }, update: data, create: data });
        } catch (_) { /* skip */ }
      }
    }

    // ── Loans ────────────────────────────────────────────────────
    const loanSheet = wb.Sheets["Prestamos"];
    if (loanSheet) {
      const rows = xlsx.utils.sheet_to_json(loanSheet, { raw: false });
      for (const row of rows as any[]) {
        if (!row.id || !row.component_id) continue;
        try {
          const data: any = {
            id: String(row.id),
            component_id: String(row.component_id),
            quantity: parseInt(row.quantity) || 1,
            person: toStrOrNull(row.person) ?? "Desconocido",
            status: toStrOrNull(row.status) ?? "PRESTADO",
            notes: toStrOrNull(row.notes),
            loan_date: row.loan_date ? new Date(row.loan_date) : new Date(),
            expected_return_date: row.expected_return_date ? new Date(row.expected_return_date) : null,
            actual_return_date: row.actual_return_date ? new Date(row.actual_return_date) : null,
          };
          await prisma.loan.upsert({ where: { id: data.id }, update: data, create: data });
        } catch (_) { /* skip */ }
      }
    }

    // ── Movements ────────────────────────────────────────────────
    const movSheet = wb.Sheets["Movimientos"];
    if (movSheet) {
      const rows = xlsx.utils.sheet_to_json(movSheet, { raw: false });
      for (const row of rows as any[]) {
        if (!row.id || !row.component_id) continue;
        try {
          const data: any = {
            id: String(row.id),
            component_id: String(row.component_id),
            type: toStrOrNull(row.type) ?? "AJUSTE_MANUAL",
            quantity: parseInt(row.quantity) || 0,
            notes: toStrOrNull(row.notes),
            date: row.date ? new Date(row.date) : new Date(),
          };
          await prisma.movement.upsert({ where: { id: data.id }, update: data, create: data });
        } catch (_) { /* skip */ }
      }
    }

    const message =
      errors.length > 0
        ? `Importados: ${importedCount}. Advertencias: ${errors.slice(0, 3).join("; ")}`
        : `${importedCount} componentes importados correctamente.`;

    revalidatePath("/", "layout");

    return NextResponse.json({ success: true, count: importedCount, message, errors });
  } catch (error: any) {
    console.error("Import error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
