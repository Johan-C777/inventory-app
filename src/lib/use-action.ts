"use client";

import { useCallback, useTransition } from "react";
import { toast } from "sonner";
import type { Result } from "./safe-action";

/**
 * Ejecuta una Server Action con estado pendiente y toasts.
 * Reemplaza el bloque startTransition + if (res.success) + addNotification repetido en cada componente.
 */
export function useAction() {
  const [pending, startTransition] = useTransition();

  const run = useCallback(
    <T,>(
      call: () => Promise<Result<T>>,
      opts: { success?: string | ((data: T) => string | undefined); onSuccess?: (data: T) => void } = {},
    ) => {
      startTransition(async () => {
        const res = await call();
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        const msg = typeof opts.success === "function" ? opts.success(res.data) : opts.success;
        if (msg) toast.success(msg);
        opts.onSuccess?.(res.data);
      });
    },
    [],
  );

  return { pending, run };
}

export const formValues = (form: HTMLFormElement) => Object.fromEntries(new FormData(form));
