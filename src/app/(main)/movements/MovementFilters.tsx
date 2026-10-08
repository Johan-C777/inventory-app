"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input, Select } from "@/components/ui/form";
import { MOVEMENT_LABEL, MOVEMENT_TYPES } from "@/lib/stock";
import { cn } from "@/lib/utils";

/** Única parte cliente de la página: escribe los filtros en la URL. */
export function MovementFilters({ q, type }: { q: string; type: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const push = (next: { q?: string; type?: string }) => {
    const params = new URLSearchParams();
    const merged = { q, type, ...next };
    if (merged.q) params.set("q", merged.q);
    if (merged.type && merged.type !== "ALL") params.set("type", merged.type);
    startTransition(() => router.replace(`${pathname}?${params}`, { scroll: false }));
  };

  return (
    <form
      className={cn("flex flex-wrap items-center gap-3 border-b p-4 transition-opacity", pending && "opacity-60")}
      onSubmit={(e) => {
        e.preventDefault();
        push({ q: String(new FormData(e.currentTarget).get("q") ?? "") });
      }}
    >
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={q} placeholder="Componente, referencia o nota. Enter para buscar" aria-label="Buscar movimientos" className="pl-9" />
      </div>
      <Select value={type} onChange={(e) => push({ type: e.target.value })} aria-label="Tipo de movimiento" className="w-auto min-w-44">
        <option value="ALL">Todos los tipos</option>
        {MOVEMENT_TYPES.map((t) => (
          <option key={t} value={t}>
            {MOVEMENT_LABEL[t]}
          </option>
        ))}
      </Select>
    </form>
  );
}
