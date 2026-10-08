"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { action } from "@/lib/safe-action";

export const resetDatabase = action(z.object({ confirm: z.literal("BORRAR TODO", "Escribe BORRAR TODO para confirmar") }), async () => {
  await prisma.$transaction([
    prisma.loan.deleteMany(),
    prisma.movement.deleteMany(),
    prisma.wishlistItem.deleteMany(),
    prisma.project.deleteMany(),
    prisma.component.deleteMany(),
    prisma.person.deleteMany(),
  ]);
});

// Los préstamos activos se conservan: borrarlos dejaría stock prestado que nunca vuelve.
export const clearHistory = action(z.object({ confirm: z.literal("LIMPIAR", "Escribe LIMPIAR para confirmar") }), async () => {
  await prisma.$transaction([
    prisma.movement.deleteMany(),
    prisma.loan.deleteMany({ where: { status: { not: "PRESTADO" } } }),
  ]);
});
