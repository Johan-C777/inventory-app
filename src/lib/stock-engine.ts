import "server-only";
import type { Prisma } from "@prisma/client";
import { UserError } from "./safe-action";
import { signedDelta, stockLevel, suggestedReorder, type MovementType } from "./stock";

type Tx = Prisma.TransactionClient;

const ENGINE_SELECT = {
  id: true,
  name: true,
  category: true,
  unit: true,
  current_quantity: true,
  min_stock: true,
  reorder_qty: true,
  auto_reorder: true,
  approximate_cost: true,
} satisfies Prisma.ComponentSelect;

type EngineComponent = Prisma.ComponentGetPayload<{ select: typeof ENGINE_SELECT }>;

/**
 * Único punto donde cambia el stock. Dentro de una transacción:
 * 1) ajusta la cantidad sin permitir negativos, 2) deja el movimiento, 3) dispara la wishlist automática.
 */
export async function applyStock(
  tx: Tx,
  p: { componentId: string; type: MovementType; quantity: number; notes?: string | null; source?: string },
) {
  const delta = signedDelta(p.type, p.quantity);
  if (delta === 0) throw new UserError("La cantidad no puede ser 0");

  // El WHERE hace el chequeo atómico: dos descuentos simultáneos no pueden dejar stock negativo.
  const { count } = await tx.component.updateMany({
    where: { id: p.componentId, ...(delta < 0 && { current_quantity: { gte: -delta } }) },
    data: { current_quantity: { increment: delta } },
  });
  if (!count) throw new UserError(delta < 0 ? "No hay stock suficiente" : "El componente ya no existe");

  await tx.movement.create({
    data: {
      component_id: p.componentId,
      type: p.type,
      quantity: p.type === "AJUSTE_MANUAL" ? delta : Math.abs(delta),
      notes: p.notes || null,
      source: p.source ?? "MANUAL",
    },
  });

  const component = await tx.component.findUniqueOrThrow({ where: { id: p.componentId }, select: ENGINE_SELECT });
  const wishlisted = await autoWishlist(tx, component, p.type);
  return { component, delta, wishlisted };
}

/**
 * Mantiene el pedido automático como espejo del stock. Idempotente.
 * Bajo mínimo → lo crea o lo actualiza. De vuelta sobre el mínimo → lo cierra.
 */
export async function autoWishlist(tx: Tx, c: EngineComponent, cause?: MovementType) {
  const level = stockLevel(c.current_quantity, c.min_stock);
  const auto = await tx.wishlistItem.findFirst({ where: { component_id: c.id, status: "PENDIENTE", auto_generated: true } });

  if (level === "ok") {
    if (auto && cause === "COMPRA") await tx.wishlistItem.update({ where: { id: auto.id }, data: { status: "COMPRADO" } });
    else if (auto) await tx.wishlistItem.delete({ where: { id: auto.id } }); // devolución o ajuste: nunca hizo falta comprar
    return false;
  }
  if (!c.auto_reorder) return false;

  const fresh = {
    priority: level === "out" ? "URGENTE" : "ALTA",
    reason: level === "out" ? "Agotado" : `Quedan ${c.current_quantity}, mínimo ${c.min_stock}`,
  };
  if (auto) {
    await tx.wishlistItem.update({ where: { id: auto.id }, data: { ...fresh, quantity: Math.max(auto.quantity, suggestedReorder(c)) } });
    return false;
  }
  // Si ya lo pediste a mano, no se duplica
  if (await tx.wishlistItem.findFirst({ where: { component_id: c.id, status: "PENDIENTE" }, select: { id: true } })) return false;

  await tx.wishlistItem.create({
    data: {
      ...fresh,
      name: c.name,
      category: c.category,
      quantity: suggestedReorder(c),
      estimated_price: c.approximate_cost,
      component_id: c.id,
      auto_generated: true,
    },
  });
  return true;
}

export { ENGINE_SELECT };
