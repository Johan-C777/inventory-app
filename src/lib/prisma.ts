import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;

// Búsqueda sin distinguir mayúsculas, portable entre motores:
// en SQLite `contains` ya las ignora y no acepta `mode`; en Postgres hay que pedirlo.
const isSqlite = (process.env.DATABASE_URL ?? "").startsWith("file:");
export const ci: { mode?: "insensitive" } = isSqlite ? {} : { mode: "insensitive" };
