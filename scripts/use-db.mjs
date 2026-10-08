// Cambia el motor en prisma/schema.prisma. Uso: node scripts/use-db.mjs sqlite|postgresql
// Prisma no permite elegir el provider por variable de entorno; el resto del esquema es idéntico en ambos.
import { readFileSync, writeFileSync } from "node:fs";

const provider = process.argv[2];
if (!["sqlite", "postgresql"].includes(provider)) {
  console.error("Uso: node scripts/use-db.mjs sqlite|postgresql");
  process.exit(1);
}

const file = "prisma/schema.prisma";
const schema = readFileSync(file, "utf8");
const next = schema.replace(/(datasource db \{[\s\S]*?provider\s*=\s*")[^"]+(")/, `$1${provider}$2`);
if (next === schema && !schema.includes(`provider = "${provider}"`)) {
  console.error("No encontré el bloque datasource en prisma/schema.prisma");
  process.exit(1);
}
writeFileSync(file, next);
console.log(`prisma/schema.prisma → provider = "${provider}"`);
