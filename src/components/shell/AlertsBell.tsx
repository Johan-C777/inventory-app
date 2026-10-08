"use client";

import Link from "next/link";
import { Popover } from "radix-ui";
import { Bell, CircleCheck } from "lucide-react";
import type { Alert } from "@/lib/queries";
import { cn } from "@/lib/utils";

/** Antes: alert("¡No tienes notificaciones!") con un 0 fijo. Ahora: alertas reales calculadas en el servidor. */
export function AlertsBell({ alerts }: { alerts: Alert[] }) {
  const urgent = alerts.some((a) => a.tone === "danger");
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={alerts.length ? `${alerts.length} alertas` : "Sin alertas"}
        className="relative grid size-10 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-plate hover:text-foreground data-[state=open]:bg-plate data-[state=open]:text-foreground"
      >
        <Bell className="size-5" />
        {alerts.length > 0 && (
          <span
            className={cn(
              "num absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-sm px-1 text-[10px] font-bold",
              urgent ? "animate-alarm bg-danger text-white" : "bg-warn text-black",
            )}
          >
            {alerts.length}
          </span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={10}
          className="z-50 w-[min(92vw,22rem)] rounded-md border border-input bg-popover shadow-2xl shadow-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2"
        >
          <p className="border-b px-4 py-3 font-display text-sm font-semibold">Alertas</p>
          {alerts.length === 0 ? (
            <div className="flex items-center gap-3 px-4 py-6 text-sm text-muted-foreground">
              <CircleCheck className="size-5 text-ok" />
              Stock y préstamos al día.
            </div>
          ) : (
            <ul className="max-h-[60vh] divide-y overflow-y-auto">
              {alerts.map((a) => (
                <li key={a.id}>
                  <Popover.Close asChild>
                    <Link href={a.href} className="flex gap-3 px-4 py-3 transition-colors hover:bg-plate">
                      <span className={cn("mt-1.5 size-2 shrink-0", a.tone === "danger" ? "bg-danger" : "bg-warn")} />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{a.title}</span>
                        <span className="block truncate text-[13px] text-muted-foreground">{a.detail}</span>
                      </span>
                    </Link>
                  </Popover.Close>
                </li>
              ))}
            </ul>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
