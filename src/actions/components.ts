"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { action, formAction, UserError } from "@/lib/safe-action";
import { MOUNT_TYPES } from "@/lib/enums";
import { applyStock, autoWishlist, ENGINE_SELECT } from "@/lib/stock-engine";
import { checkbox, id, int, oneOf, optInt, optNum, optText, optUrl, text } from "@/lib/zod";

const componentSchema = z.object({
  name: text(120),
  category: text(60),
  subcategory: optText(60),
  part_number: optText(60),
  value: optText(60),
  approximate_cost: optNum,
  unit: text(10).default("uds"),
  location: optText(60),
  min_stock: int().default(0),
  description: optText(600),
  image_url: optUrl,
  datasheet_url: optUrl,
  mount_type: oneOf(MOUNT_TYPES),
  package_type: optText(30),
  manufacturer: optText(60),
  barcode: optText(120),
  auto_reorder: checkbox,
  reorder_qty: optInt,
});

async function assertBarcodeFree(barcode: string | null, exceptId?: string) {
  if (!barcode) return;
  const taken = await prisma.component.findFirst({
    where: { barcode, ...(exceptId && { id: { not: exceptId } }) },
    select: { name: true },
  });
  if (taken) throw new UserError(`Ese código ya está vinculado a "${taken.name}"`);
}

export const createComponent = formAction(
  componentSchema.extend({ current_quantity: int().default(0) }),
  async ({ current_quantity, ...data }) => {
    await assertBarcodeFree(data.barcode);
    return prisma.$transaction(async (tx) => {
      const created = await tx.component.create({ data, select: { id: true } });
      // El stock inicial entra como movimiento: el historial siempre cuadra con la cantidad
      if (current_quantity > 0) {
        await applyStock(tx, { componentId: created.id, type: "COMPRA", quantity: current_quantity, notes: "Stock inicial" });
      }
      return created;
    });
  },
);

// El stock no se edita aquí: solo cambia con movimientos (ver registerMovement / recountStock).
export const updateComponent = formAction(componentSchema.extend({ id }), async ({ id, ...data }) => {
  await assertBarcodeFree(data.barcode, id);
  await prisma.$transaction(async (tx) => {
    const updated = await tx.component.update({ where: { id }, data, select: ENGINE_SELECT });
    await autoWishlist(tx, updated); // subir el mínimo puede dejarlo bajo stock
  });
});

export const deleteComponent = action(z.object({ id }), async ({ id }) => {
  await prisma.component.delete({ where: { id } });
});

export const registerMovement = action(
  z.object({
    componentId: id,
    type: z.enum(["COMPRA", "USO", "PERDIDA", "DANO"]),
    quantity: int(1),
    notes: optText(200),
  }),
  async ({ componentId, type, quantity, notes }) => {
    const r = await prisma.$transaction((tx) => applyStock(tx, { componentId, type, quantity, notes }));
    return { name: r.component.name, quantity: r.component.current_quantity, unit: r.component.unit, wishlisted: r.wishlisted };
  },
);

/** Conteo físico: guarda la diferencia como ajuste. */
export const recountStock = action(z.object({ componentId: id, counted: int(0) }), async ({ componentId, counted }) => {
  return prisma.$transaction(async (tx) => {
    const c = await tx.component.findUniqueOrThrow({ where: { id: componentId }, select: { current_quantity: true } });
    const diff = counted - c.current_quantity;
    if (diff === 0) return { diff };
    await applyStock(tx, { componentId, type: "AJUSTE_MANUAL", quantity: diff, notes: "Conteo físico" });
    return { diff };
  });
});

// ── Placas compatibles ───────────────────────────────────────

export const createBoard = formAction(
  z.object({ name: text(80), family: text(40), mcu: optText(80), logic_voltage: optNum, notes: optText(300) }),
  async (data) => {
    const exists = await prisma.board.findUnique({ where: { name: data.name }, select: { id: true } });
    if (exists) throw new UserError("Ya existe una placa con ese nombre");
    return prisma.board.create({ data, select: { id: true } });
  },
);

export const deleteBoard = action(z.object({ id }), async ({ id }) => {
  await prisma.board.delete({ where: { id } });
});

export const linkBoard = action(
  z.object({ componentId: id, boardId: id, note: optText(120) }),
  async ({ componentId, boardId, note }) => {
    await prisma.componentBoard.upsert({
      where: { component_id_board_id: { component_id: componentId, board_id: boardId } },
      update: { note },
      create: { component_id: componentId, board_id: boardId, note },
    });
  },
);

export const unlinkBoard = action(z.object({ componentId: id, boardId: id }), async ({ componentId, boardId }) => {
  await prisma.componentBoard.delete({
    where: { component_id_board_id: { component_id: componentId, board_id: boardId } },
  });
});

const ESP32_BOARDS = [
  { name: "ESP32 DevKit V1", family: "ESP32", mcu: "ESP32-WROOM-32", logic_voltage: 3.3, notes: "Wi-Fi + BT clásico/BLE. ADC2 no disponible con Wi-Fi activo." },
  { name: "ESP32-S3 DevKitC-1", family: "ESP32", mcu: "ESP32-S3-WROOM-1", logic_voltage: 3.3, notes: "USB nativo, BLE 5, instrucciones vectoriales. Sin BT clásico." },
  { name: "ESP32-C3 SuperMini", family: "ESP32", mcu: "ESP32-C3FH4", logic_voltage: 3.3, notes: "RISC-V de un núcleo, BLE 5, USB nativo. Pocos GPIO." },
  { name: "ESP32-C6 DevKitC-1", family: "ESP32", mcu: "ESP32-C6-WROOM-1", logic_voltage: 3.3, notes: "Wi-Fi 6, BLE 5, Zigbee/Thread." },
  { name: "ESP32-CAM", family: "ESP32", mcu: "ESP32-S (AI-Thinker)", logic_voltage: 3.3, notes: "Cámara OV2640. Sin USB: requiere programador FTDI." },
  { name: "ESP32-S2 Mini", family: "ESP32", mcu: "ESP32-S2FN4R2", logic_voltage: 3.3, notes: "USB nativo, solo Wi-Fi (sin Bluetooth)." },
];

export const seedEsp32Boards = action(z.object({}), async () => {
  // Portable: la opción de Prisma para saltar duplicados en createMany no existe en SQLite
  const existing = new Set((await prisma.board.findMany({ select: { name: true } })).map((b) => b.name));
  const missing = ESP32_BOARDS.filter((b) => !existing.has(b.name));
  for (const data of missing) await prisma.board.create({ data });
  return { count: missing.length };
});
