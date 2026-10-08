// Ejecutar una vez tras migrar: crea las personas a partir de los préstamos antiguos (campo de texto `person`).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const loans = await prisma.loan.findMany({ where: { borrower_id: null }, select: { id: true, person: true } });
let linked = 0;
for (const loan of loans) {
  const name = loan.person.trim();
  if (!name) continue;
  const people = await prisma.person.findMany();
  const person = people.find((p) => p.name.toLowerCase() === name.toLowerCase()) ?? (await prisma.person.create({ data: { name } }));
  await prisma.loan.update({ where: { id: loan.id }, data: { borrower_id: person.id, person: person.name } });
  linked++;
}
console.log(`Préstamos enlazados a personas: ${linked}`);
await prisma.$disconnect();
