"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Handshake, Plus, Printer, ScanLine, Search } from "lucide-react";
import type { ComponentLite } from "@/lib/queries";
import { stockLevel } from "@/lib/stock";
import { cn } from "@/lib/utils";
import { NAV, SETTINGS } from "./nav";

const ACTIONS = [
  { name: "Nuevo componente", href: "/inventory?new=1", icon: Plus },
  { name: "Escanear código", href: "/scan", icon: ScanLine },
  { name: "Nuevo préstamo", href: "/loans?new=1", icon: Handshake },
  { name: "Imprimir etiquetas QR", href: "/labels", icon: Printer },
];

const DOT = { ok: "bg-ok", low: "bg-warn", out: "bg-danger" } as const;
const itemClass =
  "flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2 text-sm data-[selected=true]:bg-primary/12 data-[selected=true]:text-foreground";

/** La búsqueda de la barra superior antes no hacía nada. Ahora busca en todo el inventario. Ctrl/⌘ + K. */
export function CommandPalette({ index }: { index: ComponentLite[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-10 w-full max-w-md items-center gap-3 rounded-md border border-input bg-background/60 px-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/50"
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 truncate">Buscar componente, referencia o caja</span>
        <kbd className="num hidden rounded-sm border border-input px-1.5 text-[11px] sm:block">Ctrl K</kbd>
      </button>

      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Buscar"
        // Coincidencia exacta por términos: el difuso de cmdk mezclaba "esp32" con "regleta de pines"
        filter={(value, search) => (search.toLowerCase().split(/\s+/).every((t) => value.toLowerCase().includes(t)) ? 1 : 0)}
        overlayClassName="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0"
        contentClassName="hud fixed left-1/2 top-[12vh] z-50 w-[min(92vw,40rem)] -translate-x-1/2 outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-top-4 duration-200"
      >
        <div className="flex items-center gap-3 border-b px-5">
          <Search className="size-4 text-primary" />
          <Command.Input
            placeholder="74LS08, 10k, Caja Verde…"
            className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        <Command.List className="max-h-[52vh] overflow-y-auto p-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground">
          <Command.Empty className="px-3 py-10 text-center text-sm text-muted-foreground">
            Nada coincide. Prueba con la referencia o el valor.
          </Command.Empty>

          <Command.Group heading="Acciones">
            {ACTIONS.map((a) => (
              <Command.Item key={a.href} value={a.name} onSelect={() => go(a.href)} className={itemClass}>
                <a.icon className="size-4 text-primary" />
                {a.name}
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Group heading="Componentes">
            {index.map((c) => (
              <Command.Item
                key={c.id}
                value={`${c.name} ${c.value ?? ""} ${c.part_number ?? ""} ${c.category} ${c.location ?? ""} ${c.id}`}
                onSelect={() => go(`/inventory/${c.id}`)}
                className={itemClass}
              >
                <span className={cn("size-2 shrink-0", DOT[stockLevel(c.current_quantity, c.min_stock)])} />
                <span className="min-w-0 flex-1 truncate">
                  {c.name}
                  {c.value && <span className="text-muted-foreground"> {c.value}</span>}
                </span>
                {c.part_number && <span className="num hidden text-xs text-muted-foreground sm:block">{c.part_number}</span>}
                <span className="num w-16 text-right text-xs">
                  {c.current_quantity} {c.unit}
                </span>
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Group heading="Ir a">
            {[...NAV, SETTINGS].map((n) => (
              <Command.Item key={n.href} value={`Ir a ${n.name}`} onSelect={() => go(n.href)} className={itemClass}>
                <n.icon className="size-4 text-muted-foreground" />
                {n.name}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command.Dialog>
    </>
  );
}
