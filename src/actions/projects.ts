"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { action, formAction, UserError } from "@/lib/safe-action";
import { PRINT_STATUSES, PROJECT_KINDS, PROJECT_STATUSES } from "@/lib/enums";
import { applyStock } from "@/lib/stock-engine";
import { id, int, optDate, optInt, optNum, optText, optUrl, text } from "@/lib/zod";

export const saveProject = formAction(
  z.object({
    id: id.optional(),
    name: text(100),
    description: optText(600),
    kind: z.enum(PROJECT_KINDS).default("ELECTRONICO"),
    status: z.enum(PROJECT_STATUSES).default("ACTIVO"),
    board_id: optText(64),
    repo_url: optUrl,
    due_date: optDate,
  }),
  async ({ id, ...data }) => {
    if (id) return prisma.project.update({ where: { id }, data, select: { id: true } });
    return prisma.project.create({ data, select: { id: true } });
  },
);

export const deleteProject = action(z.object({ id }), async ({ id }) => {
  await prisma.project.delete({ where: { id } });
});

export const linkComponent = action(
  z.object({ projectId: id, componentId: id, quantity: int(1).default(1), printPartId: id.nullish() }),
  async ({ projectId, componentId, quantity, printPartId }) => {
    await prisma.projectComponent.upsert({
      where: { project_id_component_id: { project_id: projectId, component_id: componentId } },
      update: { quantity, print_part_id: printPartId ?? null },
      create: { project_id: projectId, component_id: componentId, quantity, print_part_id: printPartId ?? null },
    });
  },
);

export const unlinkComponent = action(z.object({ projectId: id, componentId: id }), async ({ projectId, componentId }) => {
  await prisma.projectComponent.delete({
    where: { project_id_component_id: { project_id: projectId, component_id: componentId } },
  });
});

/** Descuenta del stock toda la lista de materiales del proyecto. Todo o nada. */
export const consumeBom = action(z.object({ projectId: id }), async ({ projectId }) => {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { components: { include: { component: { select: { name: true, current_quantity: true } } } } },
  });
  if (!project.components.length) throw new UserError("El proyecto no tiene componentes");
  const short = project.components.filter((pc) => pc.component.current_quantity < pc.quantity);
  if (short.length) throw new UserError(`Falta stock de: ${short.map((s) => s.component.name).join(", ")}`);

  await prisma.$transaction(async (tx) => {
    for (const pc of project.components) {
      await applyStock(tx, {
        componentId: pc.component_id,
        type: "USO",
        quantity: pc.quantity,
        source: "PROJECT",
        notes: `Proyecto: ${project.name}`,
      });
    }
  });
  return { lines: project.components.length };
});

// ── Piezas impresas ──────────────────────────────────────────

export const savePrintPart = formAction(
  z.object({
    project_id: id,
    name: text(100),
    quantity: int(1).default(1),
    material: optText(30),
    printer: optText(60),
    filament_grams: optNum,
    print_minutes: optInt,
    file_url: optUrl,
    notes: optText(300),
  }),
  async (data) => {
    await prisma.printPart.create({ data });
  },
);

export const setPrintStatus = action(z.object({ id, status: z.enum(PRINT_STATUSES) }), async ({ id, status }) => {
  await prisma.printPart.update({ where: { id }, data: { status } });
});

/** Nueva iteración de una pieza de prueba: copia la ficha como v+1. */
export const iteratePrintPart = action(z.object({ id }), async ({ id }) => {
  const src = await prisma.printPart.findUniqueOrThrow({ where: { id } });
  const last = await prisma.printPart.aggregate({ where: { project_id: src.project_id, name: src.name }, _max: { iteration: true } });
  await prisma.printPart.create({
    data: {
      project_id: src.project_id,
      name: src.name,
      quantity: src.quantity,
      material: src.material,
      printer: src.printer,
      filament_grams: src.filament_grams,
      print_minutes: src.print_minutes,
      file_url: src.file_url,
      iteration: Math.max(src.iteration, last._max.iteration ?? 0) + 1,
    },
  });
});

export const deletePrintPart = action(z.object({ id }), async ({ id }) => {
  await prisma.printPart.delete({ where: { id } });
});
