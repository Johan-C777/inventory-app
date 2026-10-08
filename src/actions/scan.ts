"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { action, UserError } from "@/lib/safe-action";
import { applyStock } from "@/lib/stock-engine";
import { id, int } from "@/lib/zod";

const SELECT = { id: true, name: true, value: true, part_number: true, unit: true, location: true, current_quantity: true, min_stock: true } as const;

/** Orden: QR propio (URL con el id) → código de bolsa aprendido → referencia exacta. */
async function resolve(raw: string) {
  const code = raw.trim();
  const fromUrl = code.match(/\/inventory\/([\w-]{8,64})/)?.[1];
  const byId = await prisma.component.findUnique({ where: { id: fromUrl ?? code }, select: SELECT });
  if (byId) return byId;
  return (
    (await prisma.component.findFirst({ where: { barcode: code }, select: SELECT })) ??
    // Variantes de mayúsculas en vez del modo "insensitive" (solo Postgres)
    (await prisma.component.findFirst({ where: { part_number: { in: [code, code.toUpperCase(), code.toLowerCase()] } }, select: SELECT }))
  );
}

// Una sola ida al servidor por lectura: resuelve el código y, si aplica, mueve el stock.
export const scanCode = action(
  z.object({ code: z.string().trim().min(1).max(400), mode: z.enum(["lookup", "in", "out"]), quantity: int(1, 999).default(1) }),
  async ({ code, mode, quantity }) => {
    const component = await resolve(code);
    if (!component) return { found: false as const, code };
    if (mode === "lookup") return { found: true as const, component, delta: 0, wishlisted: false };

    const r = await prisma.$transaction((tx) =>
      applyStock(tx, {
        componentId: component.id,
        type: mode === "in" ? "COMPRA" : "USO",
        quantity,
        source: "SCAN",
        notes: "Escáner",
      }),
    );
    return {
      found: true as const,
      component: { ...component, current_quantity: r.component.current_quantity },
      delta: r.delta,
      wishlisted: r.wishlisted,
    };
  },
);

/** Deshace una lectura con un ajuste inverso (queda en el historial). */
export const undoScan = action(z.object({ componentId: id, delta: z.number().int() }), async ({ componentId, delta }) => {
  await prisma.$transaction((tx) =>
    applyStock(tx, { componentId, type: "AJUSTE_MANUAL", quantity: -delta, source: "SCAN", notes: "Lectura deshecha" }),
  );
});

/** Enseña al sistema un código de bolsa desconocido. */
export const linkBarcode = action(
  z.object({ componentId: id, code: z.string().trim().min(1).max(120) }),
  async ({ componentId, code }) => {
    const taken = await prisma.component.findFirst({ where: { barcode: code, id: { not: componentId } }, select: { name: true } });
    if (taken) throw new UserError(`Ese código ya está vinculado a "${taken.name}"`);
    const c = await prisma.component.update({ where: { id: componentId }, data: { barcode: code }, select: { name: true } });
    return { name: c.name };
  },
);
