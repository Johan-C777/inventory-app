import { z } from "zod";

// Los formularios mandan "" para lo vacío: estos helpers lo convierten en null.
export const id = z.string().min(1).max(64);
export const text = (max = 120) => z.string().trim().min(1, "Completa los campos obligatorios").max(max);
export const optText = (max = 500) =>
  z.string().trim().max(max).nullish().transform((v) => v || null);
export const optUrl = z
  .string()
  .trim()
  .max(600)
  .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "Los enlaces deben empezar por http:// o https://")
  .nullish()
  .transform((v) => v || null);
export const int = (min = 0, max = 1_000_000) =>
  z.coerce.number<string | number>("Escribe un número").int("Usa números enteros").min(min, `El mínimo es ${min}`).max(max);
export const optInt = z
  .union([z.literal(""), z.coerce.number<string | number>().int().min(0)])
  .nullish()
  .transform((v) => (v === "" || v == null ? null : v));
export const optNum = z
  .union([z.literal(""), z.coerce.number<string | number>().min(0)])
  .nullish()
  .transform((v) => (v === "" || v == null ? null : v));
export const optDate = z
  .string()
  .nullish()
  .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Fecha inválida")
  .transform((v) => (v ? new Date(v) : null));
export const checkbox = z
  .union([z.string(), z.boolean()])
  .optional()
  .transform((v) => v === true || v === "on" || v === "true");
export const oneOf = <const T extends readonly [string, ...string[]]>(values: T) =>
  z
    .union([z.enum(values), z.literal("")])
    .nullish()
    .transform((v) => (v ? (v as T[number]) : null));
