"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { action, formAction, UserError } from "@/lib/safe-action";
import { applyStock } from "@/lib/stock-engine";
import { sameText } from "@/lib/enums";
import { id, int, optDate, optText, text } from "@/lib/zod";

export const createLoan = formAction(
  z.object({
    component_id: id,
    person: text(80),
    contact: optText(80),
    quantity: int(1),
    expected_return_date: optDate,
    notes: optText(300),
  }),
  async ({ component_id, person, contact, quantity, expected_return_date, notes }) => {
    await prisma.$transaction(async (tx) => {
      // "juan" y "Juan" son la misma persona
      // Comparación en JS: el modo "insensitive" de Prisma solo existe en Postgres
      const existing = (await tx.person.findMany()).find((p) => sameText(p.name, person));
      const borrower = existing
        ? contact && contact !== existing.contact
          ? await tx.person.update({ where: { id: existing.id }, data: { contact } })
          : existing
        : await tx.person.create({ data: { name: person, contact } });

      await applyStock(tx, { componentId: component_id, type: "PRESTAMO", quantity, source: "LOAN", notes: `Préstamo a ${borrower.name}` });
      await tx.loan.create({
        data: { component_id, quantity, person: borrower.name, borrower_id: borrower.id, expected_return_date, notes },
      });
    });
  },
);

export const closeLoan = action(
  z.object({ id, outcome: z.enum(["DEVUELTO", "PERDIDO"]) }),
  async ({ id, outcome }) => {
    await prisma.$transaction(async (tx) => {
      // updateMany + status en el WHERE: un doble clic no devuelve el stock dos veces
      const { count } = await tx.loan.updateMany({
        where: { id, status: "PRESTADO" },
        data: { status: outcome, actual_return_date: new Date() },
      });
      if (!count) throw new UserError("Ese préstamo ya estaba cerrado");
      if (outcome === "DEVUELTO") {
        const loan = await tx.loan.findUniqueOrThrow({ where: { id } });
        await applyStock(tx, {
          componentId: loan.component_id,
          type: "DEVOLUCION",
          quantity: loan.quantity,
          source: "LOAN",
          notes: `Devolución de ${loan.person}`,
        });
      }
    });
  },
);

export const extendLoan = action(z.object({ id, days: int(1, 90) }), async ({ id, days }) => {
  const loan = await prisma.loan.findUniqueOrThrow({ where: { id } });
  const base = Math.max(Date.now(), loan.expected_return_date?.getTime() ?? 0);
  const next = new Date(base + days * 86_400_000);
  next.setUTCHours(0, 0, 0, 0);
  await prisma.loan.update({ where: { id }, data: { expected_return_date: next, reminded_at: null } });
});
