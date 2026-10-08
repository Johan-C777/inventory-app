"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { action, formAction, UserError } from "@/lib/safe-action";
import { applyStock, autoWishlist, ENGINE_SELECT } from "@/lib/stock-engine";
import { stockLevel, suggestedReorder } from "@/lib/stock";
import { id, int, optNum, optText, optUrl, text } from "@/lib/zod";

const itemSchema = z.object({
  name: text(120),
  category: text(60),
  quantity: int(1).default(1),
  priority: z.enum(["BAJA", "MEDIA", "ALTA", "URGENTE"]).default("MEDIA"),
  estimated_price: optNum,
  store: optText(80),
  url: optUrl,
  reason: optText(300),
});

export const saveWishlistItem = formAction(itemSchema.extend({ id: id.optional() }), async ({ id, ...data }) => {
  if (id) await prisma.wishlistItem.update({ where: { id }, data });
  else await prisma.wishlistItem.create({ data });
});

export const setWishlistStatus = action(
  z.object({ id, status: z.enum(["PENDIENTE", "DESCARTADO"]) }),
  async ({ id, status }) => {
    await prisma.wishlistItem.update({ where: { id }, data: { status } });
  },
);

/** Cierra el ciclo: comprado → entra al stock del componente enlazado. */
export const purchaseWishlistItem = action(z.object({ id, restock: z.boolean() }), async ({ id, restock }) => {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.wishlistItem.updateMany({ where: { id, status: "PENDIENTE" }, data: { status: "COMPRADO" } });
    if (!count) throw new UserError("Ese ítem ya no está pendiente");
    const item = await tx.wishlistItem.findUniqueOrThrow({ where: { id } });
    if (!restock || !item.component_id) return { restocked: false };
    await applyStock(tx, {
      componentId: item.component_id,
      type: "COMPRA",
      quantity: item.quantity,
      source: "WISHLIST",
      notes: item.store ? `Compra en ${item.store}` : "Compra desde wishlist",
    });
    return { restocked: true };
  });
});

/** Botón manual: funciona aunque el componente tenga el auto-pedido apagado. */
export const quickWishlist = action(z.object({ componentId: id }), async ({ componentId }) => {
  const c = await prisma.component.findUniqueOrThrow({ where: { id: componentId }, select: ENGINE_SELECT });
  const open = await prisma.wishlistItem.findFirst({ where: { component_id: c.id, status: "PENDIENTE" } });
  if (open) throw new UserError("Ya tiene un pedido pendiente en la wishlist");
  const level = stockLevel(c.current_quantity, c.min_stock);
  await prisma.wishlistItem.create({
    data: {
      name: c.name,
      category: c.category,
      quantity: suggestedReorder(c),
      priority: level === "out" ? "URGENTE" : level === "low" ? "ALTA" : "MEDIA",
      estimated_price: c.approximate_cost,
      reason: `Quedan ${c.current_quantity}, mínimo ${c.min_stock}`,
      component_id: c.id,
    },
  });
  return { name: c.name };
});

/** Barrido completo: un pedido por cada componente bajo mínimo que aún no lo tenga. */
export const generateWishlist = action(z.object({}), async () => {
  const candidates = await prisma.component.findMany({ where: { auto_reorder: true }, select: ENGINE_SELECT });
  let created = 0;
  await prisma.$transaction(async (tx) => {
    for (const c of candidates) if (await autoWishlist(tx, c)) created++;
  });
  return { created };
});
