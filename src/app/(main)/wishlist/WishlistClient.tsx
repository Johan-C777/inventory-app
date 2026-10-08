"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Bookmark, Check, ExternalLink, PackagePlus, Pencil, Plus, RotateCcw, Sparkles, X } from "lucide-react";
import { purchaseWishlistItem, saveWishlistItem, setWishlistStatus } from "@/actions/wishlist";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Empty, Panel } from "@/components/ui/panel";
import { cop } from "@/lib/format";
import type { WishlistRow } from "@/lib/queries";
import { formValues, useAction } from "@/lib/use-action";
import { cn } from "@/lib/utils";

const PRIORITY: Record<string, { label: string; tone: Tone; rank: number }> = {
  URGENTE: { label: "Urgente", tone: "danger", rank: 0 },
  ALTA: { label: "Alta", tone: "warn", rank: 1 },
  MEDIA: { label: "Media", tone: "ion", rank: 2 },
  BAJA: { label: "Baja", tone: "neutral", rank: 3 },
};
const cost = (i: WishlistRow) => (i.estimated_price ?? 0) * i.quantity;

export default function WishlistClient({ items }: { items: WishlistRow[] }) {
  const { pending, run } = useAction();
  const [editing, setEditing] = useState<WishlistRow | "new" | null>(null);

  const open = items.filter((i) => i.status === "PENDIENTE").sort((a, b) => (PRIORITY[a.priority]?.rank ?? 9) - (PRIORITY[b.priority]?.rank ?? 9));
  const closed = items.filter((i) => i.status !== "PENDIENTE").slice(0, 12);
  const total = open.reduce((s, i) => s + cost(i), 0);
  const unpriced = open.filter((i) => i.estimated_price == null).length;

  return (
    <>
      <Panel className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="text-[13px] text-muted-foreground">Total previsto</p>
            <p className="num text-4xl font-bold leading-tight text-primary">{cop(total)}</p>
            <p className="text-[13px] text-muted-foreground">
              {open.length} {open.length === 1 ? "pedido pendiente" : "pedidos pendientes"}
              {unpriced > 0 && `, ${unpriced} sin precio`}
            </p>
          </div>
          <Button onClick={() => setEditing("new")}>
            <Plus />
            Añadir a la wishlist
          </Button>
        </div>
      </Panel>

      {open.length === 0 ? (
        <Panel>
          <Empty title="Nada por comprar" icon={<Bookmark />}>
            Cuando un componente baje de su mínimo aparecerá aquí con la cantidad a reponer.
          </Empty>
        </Panel>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          <AnimatePresence initial={false} mode="popLayout">
            {open.map((item, i) => {
              const p = PRIORITY[item.priority] ?? PRIORITY.MEDIA;
              return (
                <motion.li
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ type: "spring", stiffness: 420, damping: 34, delay: Math.min(i, 9) * 0.03 }}
                >
                  <Panel tone={p.tone === "danger" ? "danger" : p.tone === "warn" ? "warn" : "default"} className="flex h-full flex-col">
                    <div className="flex-1 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="truncate text-base">{item.name}</h2>
                          <p className="text-[13px] text-muted-foreground">{item.category}</p>
                        </div>
                        <Badge tone={p.tone}>{p.label}</Badge>
                      </div>

                      <div className="mt-4 flex items-end justify-between gap-3">
                        <p className="num text-3xl font-bold leading-none">
                          {item.quantity}
                          <span className="ml-1.5 text-sm font-medium text-muted-foreground">{item.component?.unit ?? "uds"}</span>
                        </p>
                        <p className="text-right text-sm">
                          <span className="num font-semibold">{item.estimated_price != null ? cop(cost(item)) : "Sin precio"}</span>
                          {item.estimated_price != null && item.quantity > 1 && <span className="block text-xs text-muted-foreground">{cop(item.estimated_price)} c/u</span>}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
                        {item.auto_generated && (
                          <Badge tone="ion">
                            <Sparkles className="size-3" />
                            Automático
                          </Badge>
                        )}
                        {item.reason && <span>{item.reason}</span>}
                      </div>
                      {(item.store || item.url) && (
                        <p className="mt-2 flex items-center gap-2 text-[13px]">
                          {item.store && <span className="text-muted-foreground">{item.store}</span>}
                          {item.url && (
                            <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                              Ver en la tienda <ExternalLink className="size-3.5" />
                            </a>
                          )}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 border-t p-3">
                      {item.component ? (
                        <Button
                          variant="ok"
                          size="sm"
                          className="flex-1"
                          disabled={pending}
                          onClick={() =>
                            run(() => purchaseWishlistItem({ id: item.id, restock: true }), {
                              success: `Comprado: +${item.quantity} ${item.component!.unit} de ${item.name} en stock`,
                            })
                          }
                        >
                          <PackagePlus />
                          Comprado, ingresar al stock
                        </Button>
                      ) : (
                        <Button variant="ok" size="sm" className="flex-1" disabled={pending} onClick={() => run(() => purchaseWishlistItem({ id: item.id, restock: false }), { success: `${item.name} marcado como comprado` })}>
                          <Check />
                          Comprado
                        </Button>
                      )}
                      <Button variant="ghost" size="icon-sm" aria-label={`Editar ${item.name}`} onClick={() => setEditing(item)}>
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Descartar ${item.name}`} className="hover:text-danger" disabled={pending} onClick={() => run(() => setWishlistStatus({ id: item.id, status: "DESCARTADO" }), { success: "Pedido descartado" })}>
                        <X />
                      </Button>
                    </div>
                  </Panel>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      {closed.length > 0 && (
        <Panel tone="quiet" className="mt-8">
          <h2 className="px-5 pt-5 text-base">Historial</h2>
          <ul className="mt-2 divide-y">
            {closed.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <span className={cn("size-2 shrink-0", item.status === "COMPRADO" ? "bg-ok" : "bg-input")} />
                <span className="min-w-0 flex-1 truncate">
                  {item.component ? (
                    <Link href={`/inventory/${item.component.id}`} className="hover:text-primary">
                      {item.name}
                    </Link>
                  ) : (
                    item.name
                  )}
                  <span className="num text-muted-foreground"> × {item.quantity}</span>
                </span>
                <span className="text-muted-foreground">{item.status === "COMPRADO" ? "Comprado" : "Descartado"}</span>
                {item.status === "DESCARTADO" && (
                  <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => setWishlistStatus({ id: item.id, status: "PENDIENTE" }), { success: "De vuelta en pendientes" })}>
                    <RotateCcw />
                    Recuperar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} title={editing === "new" ? "Añadir a la wishlist" : "Editar pedido"}>
        {editing && <WishlistForm item={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />}
      </Dialog>
    </>
  );
}

function WishlistForm({ item, onDone }: { item?: WishlistRow; onDone: () => void }) {
  const { pending, run } = useAction();
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const values = formValues(e.currentTarget);
        run(() => saveWishlistItem(item ? { ...values, id: item.id } : values), { success: item ? "Pedido actualizado" : "Añadido a la wishlist", onSuccess: onDone });
      }}
    >
      <Field label="Qué comprar" className="sm:col-span-2">
        <Input name="name" required defaultValue={item?.name} placeholder="Sensor ultrasónico HC-SR04" autoFocus={!item} />
      </Field>
      <Field label="Categoría">
        <Input name="category" required defaultValue={item?.category} placeholder="Sensores" />
      </Field>
      <Field label="Prioridad">
        <Select name="priority" defaultValue={item?.priority ?? "MEDIA"}>
          {Object.entries(PRIORITY).map(([value, p]) => (
            <option key={value} value={value}>
              {p.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Cantidad">
        <Input name="quantity" type="number" min={1} defaultValue={item?.quantity ?? 1} required className="num" />
      </Field>
      <Field label="Precio por unidad (COP)">
        <Input name="estimated_price" type="number" min={0} step="any" defaultValue={item?.estimated_price ?? ""} className="num" />
      </Field>
      <Field label="Tienda">
        <Input name="store" defaultValue={item?.store ?? ""} placeholder="Sigma Electrónica" />
      </Field>
      <Field label="Enlace">
        <Input name="url" type="url" defaultValue={item?.url ?? ""} placeholder="https://…" />
      </Field>
      <Field label="Para qué" className="sm:col-span-2">
        <Textarea name="reason" rows={2} defaultValue={item?.reason ?? ""} />
      </Field>
      <div className="sm:col-span-2">
        <DialogFooter>
          <Button variant="ghost" onClick={onDone}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : item ? "Guardar cambios" : "Añadir"}
          </Button>
        </DialogFooter>
      </div>
    </form>
  );
}
