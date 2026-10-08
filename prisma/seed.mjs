// Seed no destructivo: solo añade el catálogo de placas. No borra nada.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const boards = [
  { name: "ESP32 DevKit V1", family: "ESP32", mcu: "ESP32-WROOM-32", logic_voltage: 3.3 },
  { name: "ESP32-S3 DevKitC-1", family: "ESP32", mcu: "ESP32-S3-WROOM-1", logic_voltage: 3.3 },
  { name: "ESP32-C3 SuperMini", family: "ESP32", mcu: "ESP32-C3FH4", logic_voltage: 3.3 },
  { name: "ESP32-C6 DevKitC-1", family: "ESP32", mcu: "ESP32-C6-WROOM-1", logic_voltage: 3.3 },
  { name: "ESP32-CAM", family: "ESP32", mcu: "ESP32-S (AI-Thinker)", logic_voltage: 3.3 },
  { name: "ESP32-S2 Mini", family: "ESP32", mcu: "ESP32-S2FN4R2", logic_voltage: 3.3 },
];

// upsert por nombre: funciona igual en SQLite y en Postgres
for (const data of boards) await prisma.board.upsert({ where: { name: data.name }, update: {}, create: data });
console.log(`Placas en catálogo: ${await prisma.board.count()}`);
await prisma.$disconnect();
