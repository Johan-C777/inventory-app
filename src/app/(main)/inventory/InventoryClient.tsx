"use client";

import { useDeferredValue, useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import { FileText, Minus, PackageSearch, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { deleteComponent, registerMovement } from "@/actions/components";
import { ComponentForm } from "@/components/ComponentForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import { Dialog } from "@/components/ui/dialog";
import { Input, Segmented, Select } from "@/components/ui/form";
import { Empty, Panel } from "@/components/ui/panel";
import { StockMeter } from "@/components/ui/stock-meter";
import { QuickWishlistButton } from "@/components/wishlist-buttons";
import { cop } from "@/lib/format";
import type { InventoryRow } from "@/lib/queries";
import { boxColor, stockLevel } from "@/lib/stock";
import { cn } from "@/lib/utils";

export type Filters = { q: string; cat: string; loc: string; level: "all" | "attention" | "low" | "out" | "ok" };

const MOUNT: Record<string, string> = { THT: "THT", SMD: "SMD", MODULO: "Módulo", MECANICO: "Mecánico" };
const QTY_TONE = { ok: "text-foreground", low: "text-warn", out: "text-danger" } as const;
const sum = (rows: { quantity: number }[]) => rows.reduce((s, r) => s + r.quantity, 0);

export default function InventoryClient({ components, initial, openNew }: { components: InventoryRow[]; initial: Filters; openNew: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [filters, setFilters] = useState(initial);
  const [creating, setCreating] = useState(openNew);
  const [editing, setEditing] = useState<InventoryRow | null>(null);
  const [removing, setRemoving] = useState<InventoryRow | null>(null);
  const q = useDeferredValue(filters.q).trim().toLowerCase();

  // Antes: useState(initialComponents) → la lista no se enteraba de router.refresh().
  // Ahora la fuente es la prop del servidor y useOptimistic pinta el cambio mientras llega.
  const [rows, patch] = useOptimistic(components, (state, p: { id: string; delta?: number; remove?: boolean }) =>
    p.remove
      ? state.filter((c) => c.id !== p.id)
      : state.map((c) => (c.id === p.id ? { ...c, current_quantity: c.current_quantity + (p.delta ?? 0) } : c)),
  );

  const categories = useMemo(() => [...new Set(components.map((c) => c.category))].sort(), [components]);
  const locations = useMemo(() => [...new Set(components.map((c) => c.location).filter((l): l is string => !!l))].sort(), [components]);

  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  // Todo menos el nivel: de aquí salen los contadores del control segmentado
  const scoped = rows.filter(
    (c) =>
      (!filters.cat || c.category === filters.cat) &&
      (!filters.loc || (filters.loc === "__none" ? !c.location : c.location === filters.loc)) &&
      (!q || [c.name, c.value, c.part_number, c.category, c.location, c.package_type].some((v) => v?.toLowerCase().includes(q))),
  );
  const count = { low: 0, out: 0 };
  for (const c of scoped) {
    const l = stockLevel(c.current_quantity, c.min_stock);
    if (l !== "ok") count[l]++;
  }
  const visible = scoped.filter((c) => {
    const l = stockLevel(c.current_quantity, c.min_stock);
    return filters.level === "all" || (filters.level === "attention" ? l !== "ok" : l === filters.level);
  });

  const adjust = (c: InventoryRow, delta: 1 | -1) =>
    startTransition(async () => {
      patch({ id: c.id, delta });
      const res = await registerMovement({ componentId: c.id, type: delta > 0 ? "COMPRA" : "USO", quantity: 1, notes: null });
      if (!res.ok) toast.error(res.error);
      else if (res.data.wishlisted) toast.warning(`${c.name} bajó del mínimo`, { description: "Se añadió a la wishlist." });
    });

  const remove = (c: InventoryRow) =>
    startTransition(async () => {
      setRemoving(null);
      patch({ id: c.id, remove: true });
      const res = await deleteComponent({ id: c.id });
      if (res.ok) toast.success(`${c.name} eliminado`);
      else toast.error(res.error);
    });

  return (
    <>
      <Panel>
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <div className="relative min-w-[260px] flex-[2]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.q}
              onChange={(e) => set({ q: e.target.value })}
              placeholder="Nombre, valor, referencia o encapsulado"
              aria-label="Buscar en el inventario"
              className="pl-9"
            />
          </div>
          <Select value={filters.cat} onChange={(e) => set({ cat: e.target.value })} aria-label="Categoría" className="w-auto min-w-44">
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <Select value={filters.loc} onChange={(e) => set({ loc: e.target.value })} aria-label="Caja" className="w-auto min-w-36">
            <option value="">Todas las cajas</option>
            {locations.map((l) => (
              <option key={l}>{l}</option>
            ))}
            <option value="__none">Sin ubicar</option>
          </Select>
          <Segmented
            label="Nivel de stock"
            value={filters.level === "ok" || filters.level === "low" ? "all" : filters.level}
            onChange={(level) => set({ level })}
            options={[
              { value: "all", label: "Todos", count: scoped.length },
              { value: "attention", label: "Por reponer", count: count.low + count.out },
              { value: "out", label: "Agotados", count: count.out },
            ]}
          />
          <Button onClick={() => setCreating(true)} className="ml-auto">
            <Plus />
            Nuevo componente
          </Button>
        </div>

        {visible.length === 0 ? (
          <Empty title={components.length ? "Ningún componente coincide" : "El inventario está vacío"} icon={<PackageSearch />}>
            {components.length ? (
              <button className="text-primary hover:underline" onClick={() => setFilters({ q: "", cat: "", loc: "", level: "all" })}>
                Quitar filtros
              </button>
            ) : (
              "Crea tu primer componente o importa tu Excel desde Ajustes."
            )}
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-[13px] text-muted-foreground [&>th]:px-4 [&>th]:py-3 [&>th]:font-medium">
                  <th>Componente</th>
                  <th>Categoría</th>
                  <th>Caja</th>
                  <th>Costo</th>
                  <th className="w-56">Stock</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c, i) => {
                  const level = stockLevel(c.current_quantity, c.min_stock);
                  const lent = sum(c.loans);
                  const inProjects = sum(c.projects);
                  return (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(i, 14) * 0.02 }}
                      onClick={() => router.push(`/inventory/${c.id}`)}
                      className="group cursor-pointer border-t transition-colors hover:bg-plate/70 [&>td]:px-4 [&>td]:py-2.5"
                    >
                      <td>
                        <Link href={`/inventory/${c.id}`} onClick={(e) => e.stopPropagation()} className="font-medium group-hover:text-primary">
                          {c.name}
                        </Link>
                        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                          {c.value && <span className="truncate">{c.value}</span>}
                          {c.part_number && <span className="num text-xs">{c.part_number}</span>}
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge>{c.category}</Badge>
                          {(c.package_type || c.mount_type) && <Badge tone="ion">{c.package_type ?? MOUNT[c.mount_type!]}</Badge>}
                          {c.datasheet_url && (
                            <a
                              href={c.datasheet_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Datasheet de ${c.name}`}
                              className="text-muted-foreground hover:text-primary"
                            >
                              <FileText className="size-4" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td>
                        {c.location ? (
                          <span className="flex items-center gap-2 whitespace-nowrap">
                            <span className="size-2.5" style={{ background: boxColor(c.location) }} />
                            {c.location}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Sin ubicar</span>
                        )}
                      </td>
                      <td className="num whitespace-nowrap text-muted-foreground">{cop(c.approximate_cost)}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className={cn("num text-base font-semibold", QTY_TONE[level])}>
                                {c.current_quantity} <span className="text-xs font-normal text-muted-foreground">{c.unit}</span>
                              </span>
                              <span className="text-xs text-muted-foreground">mín. {c.min_stock}</span>
                            </div>
                            <StockMeter qty={c.current_quantity} min={c.min_stock} className="mt-1" />
                            {(lent > 0 || inProjects > 0) && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {lent > 0 && <span className="text-accent">{lent} prestados</span>}
                                {lent > 0 && inProjects > 0 && ", "}
                                {inProjects > 0 && <span>{inProjects} en proyectos</span>}
                              </p>
                            )}
                          </div>
                          <div className="flex" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon-sm" aria-label={`Descontar 1 de ${c.name}`} disabled={c.current_quantity <= 0} onClick={() => adjust(c, -1)}>
                              <Minus />
                            </Button>
                            <Button variant="ghost" size="icon-sm" aria-label={`Sumar 1 a ${c.name}`} onClick={() => adjust(c, 1)}>
                              <Plus />
                            </Button>
                          </div>
                        </div>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {level !== "ok" && <QuickWishlistButton componentId={c.id} ordered={c.wishlist.length > 0} />}
                          <Button variant="ghost" size="icon-sm" aria-label={`Editar ${c.name}`} onClick={() => setEditing(c)}>
                            <Pencil />
                          </Button>
                          <Button variant="ghost" size="icon-sm" aria-label={`Eliminar ${c.name}`} className="hover:text-danger" onClick={() => setRemoving(c)}>
                            <Trash2 />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t px-4 py-3 text-[13px] text-muted-foreground">
          {visible.length} de {components.length} componentes
        </p>
      </Panel>

      <Dialog open={creating} onOpenChange={setCreating} title="Nuevo componente" size="lg">
        <ComponentForm categories={categories} locations={locations} onDone={() => setCreating(false)} />
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} title={`Editar ${editing?.name ?? ""}`} size="lg">
        {editing && <ComponentForm component={editing} categories={categories} locations={locations} onDone={() => setEditing(null)} />}
      </Dialog>

      <Confirm
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Eliminar ${removing?.name ?? ""}`}
        body="Se borran también sus movimientos y préstamos. No se puede deshacer."
        confirmLabel="Eliminar componente"
        pending={pending}
        onConfirm={() => removing && remove(removing)}
      />
    </>
  );
}
