// Valores permitidos de los campos que en la base son String (SQLite no tiene enum).
// Fuente única: de aquí salen los tipos de TypeScript, las validaciones de zod y las opciones de la UI.

export const MOUNT_TYPES = ["THT", "SMD", "MODULO", "MECANICO"] as const;
export type MountType = (typeof MOUNT_TYPES)[number];

export const PROJECT_KINDS = ["ELECTRONICO", "MECANICO", "FIRMWARE", "MIXTO"] as const;
export type ProjectKind = (typeof PROJECT_KINDS)[number];

export const PROJECT_STATUSES = ["IDEA", "ACTIVO", "PAUSADO", "TERMINADO"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PRINT_STATUSES = ["PENDIENTE", "IMPRIMIENDO", "IMPRESA", "FALLIDA", "VALIDADA"] as const;
export type PrintStatus = (typeof PRINT_STATUSES)[number];

export const MOUNT_LABEL: Record<MountType, string> = {
  THT: "THT, agujero pasante",
  SMD: "SMD, montaje superficial",
  MODULO: "Módulo o placa",
  MECANICO: "Mecánico (tornillos, insertos)",
};

/** Estrecha un valor leído de la base (string) a su unión. */
export const isOneOf = <const T extends readonly string[]>(values: T, v: unknown): v is T[number] =>
  typeof v === "string" && values.includes(v);

/** Igualdad sin distinguir mayúsculas, en JS: `mode: "insensitive"` de Prisma solo existe en Postgres. */
export const sameText = (a: string, b: string) => a.trim().toLocaleLowerCase("es") === b.trim().toLocaleLowerCase("es");
