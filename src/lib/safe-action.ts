import "server-only";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { hasSession } from "./auth";

export type Result<T = void> = { ok: true; data: T } | { ok: false; error: string };

/** Error con mensaje apto para mostrar al usuario. */
export class UserError extends Error {}

// Una Server Action es un endpoint público: sesión + validación + errores en un solo envoltorio.
function build<In, S extends z.ZodType, T>(schema: S, fn: (input: z.output<S>) => Promise<T>) {
  return async (raw: In): Promise<Result<T>> => {
    try {
      if (!(await hasSession())) return { ok: false, error: "Sesión vencida. Vuelve a entrar." };
      const parsed = schema.safeParse(raw);
      if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
      const data = await fn(parsed.data);
      revalidatePath("/", "layout"); // toda la app lee del mismo inventario
      return { ok: true, data };
    } catch (e) {
      if (e instanceof UserError) return { ok: false, error: e.message };
      console.error(e);
      return { ok: false, error: "Algo falló al guardar. Intenta de nuevo." };
    }
  };
}

/** Argumentos tipados. */
export const action = <S extends z.ZodType, T>(schema: S, fn: (input: z.output<S>) => Promise<T>) =>
  build<z.input<S>, S, T>(schema, fn);

/** Recibe Object.fromEntries(new FormData(form)). */
export const formAction = <S extends z.ZodType, T>(schema: S, fn: (input: z.output<S>) => Promise<T>) =>
  build<Record<string, FormDataEntryValue>, S, T>(schema, fn);
