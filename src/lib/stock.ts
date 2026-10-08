// Reglas de stock en un solo sitio. Antes estaban copiadas (y distintas) en 4 archivos.
import { dateOnlyKey, daysBetween } from "./format";

export const MOVEMENT_TYPES = ["COMPRA", "DEVOLUCION", "USO", "PERDIDA", "DANO", "PRESTAMO", "AJUSTE_MANUAL"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const MOVEMENT_LABEL: Record<string, string> = {
  COMPRA: "Compra",
  DEVOLUCION: "Devolución",
  USO: "Uso",
  PERDIDA: "Pérdida",
  DANO: "Daño",
  PRESTAMO: "Préstamo",
  AJUSTE_MANUAL: "Ajuste",
};

const INBOUND = new Set(["COMPRA", "DEVOLUCION"]);

/** Efecto real sobre el stock. AJUSTE_MANUAL ya viene con signo. */
export function signedDelta(type: string, quantity: number) {
  if (type === "AJUSTE_MANUAL") return quantity;
  return INBOUND.has(type) ? Math.abs(quantity) : -Math.abs(quantity);
}

export type StockLevel = "ok" | "low" | "out";

/** Tener exactamente el mínimo está bien; "bajo" es estar por debajo. */
export function stockLevel(qty: number, min: number): StockLevel {
  if (qty <= 0) return "out";
  return qty < min ? "low" : "ok";
}

export const LEVEL_LABEL: Record<StockLevel, string> = { ok: "En orden", low: "Bajo mínimo", out: "Agotado" };

/** Cantidad a pedir: la configurada o reponer hasta 2× el mínimo. */
export function suggestedReorder(c: { current_quantity: number; min_stock: number; reorder_qty: number | null }) {
  return c.reorder_qty ?? Math.max(1, Math.max(c.min_stock, 1) * 2 - c.current_quantity);
}

export type LoanState = "returned" | "lost" | "overdue" | "dueSoon" | "active";

export function loanState(
  loan: { status: string; expected_return_date: Date | null },
  todayKey: string,
): { state: LoanState; days: number } {
  if (loan.status === "DEVUELTO") return { state: "returned", days: 0 };
  if (loan.status === "PERDIDO") return { state: "lost", days: 0 };
  if (!loan.expected_return_date) return { state: "active", days: 0 };
  const days = daysBetween(todayKey, dateOnlyKey(loan.expected_return_date)); // <0 = vencido
  if (days < 0) return { state: "overdue", days: -days };
  return { state: days <= 2 ? "dueSoon" : "active", days };
}

// "Caja Verde" → el color de la caja física
const BOX_COLORS: [RegExp, string][] = [
  [/verde/i, "#3fe08f"],
  [/rosa/i, "#ff7eb6"],
  [/azul/i, "#56b6ff"],
  [/roj[ao]/i, "#ff5468"],
  [/amarill[ao]/i, "#ffd84d"],
  [/naranja/i, "#ff9a4d"],
  [/morad[ao]|violeta/i, "#b08cff"],
  [/negr[ao]/i, "#5d6b82"],
  [/blanc[ao]/i, "#e4ecf7"],
  [/gris/i, "#9aa7bb"],
];
export const boxColor = (location: string | null | undefined) =>
  BOX_COLORS.find(([re]) => re.test(location ?? ""))?.[1] ?? "#3d4c66";
