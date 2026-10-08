"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Minus, Pencil, Plus, Trash2, X } from "lucide-react";
import { deleteComponent, linkBoard, recountStock, registerMovement, unlinkBoard } from "@/actions/components";
import { ComponentForm, type ComponentFormValues } from "@/components/ComponentForm";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/form";
import { useAction } from "@/lib/use-action";

const OUT_REASONS = [
  { value: "USO", label: "Lo usé" },
  { value: "DANO", label: "Se dañó" },
  { value: "PERDIDA", label: "Se perdió" },
] as const;

/** Entradas, salidas y conteo físico. Reemplaza los window.prompt de la versión anterior. */
export function StockControls({ id, name, unit, quantity }: { id: string; name: string; unit: string; quantity: number }) {
  const { pending, run } = useAction();
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState<(typeof OUT_REASONS)[number]["value"]>("USO");
  const [counting, setCounting] = useState(false);

  const move = (type: "COMPRA" | typeof reason) =>
    run(() => registerMovement({ componentId: id, type, quantity: qty, notes: null }), {
      success: (d) =>
        d.wishlisted ? `Quedan ${d.quantity} ${d.unit}. Bajó del mínimo: añadido a la wishlist.` : `Quedan ${d.quantity} ${d.unit}`,
      onSuccess: () => setQty(1),
    });

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Cantidad" className="w-24">
          <Input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} className="num text-center" />
        </Field>
        <Button variant="ok" size="lg" disabled={pending} onClick={() => move("COMPRA")}>
          <Plus />
          Entrada
        </Button>
        <div className="flex">
          <Button variant="warn" size="lg" disabled={pending || quantity < qty} onClick={() => move(reason)}>
            <Minus />
            Salida
          </Button>
          <Select value={reason} onChange={(e) => setReason(e.target.value as typeof reason)} aria-label="Motivo de la salida" className="ml-1 h-12 w-auto">
            {OUT_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </div>
        <Button variant="ghost" size="lg" onClick={() => setCounting(true)}>
          <ClipboardCheck />
          Conteo físico
        </Button>
      </div>

      <Dialog open={counting} onOpenChange={setCounting} title="Conteo físico" description={`Cuenta lo que hay de ${name} y escribe el número. La diferencia queda como ajuste.`} size="sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const counted = Number(new FormData(e.currentTarget).get("counted"));
            run(() => recountStock({ componentId: id, counted }), {
              success: (d) => (d.diff === 0 ? "Coincide con el sistema" : `Ajuste de ${d.diff > 0 ? "+" : ""}${d.diff} ${unit}`),
              onSuccess: () => setCounting(false),
            });
          }}
        >
          <Field label={`Hay en la caja (${unit})`}>
            <Input name="counted" type="number" min={0} defaultValue={quantity} required autoFocus className="num" />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCounting(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              Guardar conteo
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}

export function ComponentMenu({ component, categories, locations }: { component: ComponentFormValues; categories: string[]; locations: string[] }) {
  const router = useRouter();
  const { pending, run } = useAction();
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setEditing(true)}>
        <Pencil />
        Editar
      </Button>
      <Button variant="ghost" size="icon" aria-label="Eliminar componente" className="hover:text-danger" onClick={() => setRemoving(true)}>
        <Trash2 />
      </Button>

      <Dialog open={editing} onOpenChange={setEditing} title={`Editar ${component.name}`} size="lg">
        <ComponentForm component={component} categories={categories} locations={locations} onDone={() => setEditing(false)} />
      </Dialog>
      <Confirm
        open={removing}
        onOpenChange={setRemoving}
        title={`Eliminar ${component.name}`}
        body="Se borran también sus movimientos y préstamos. No se puede deshacer."
        confirmLabel="Eliminar componente"
        pending={pending}
        onConfirm={() => run(() => deleteComponent({ id: component.id }), { success: "Componente eliminado", onSuccess: () => router.push("/inventory") })}
      />
    </>
  );
}

type BoardOption = { id: string; name: string; family: string };

export function BoardLinks({
  componentId,
  linked,
  boards,
}: {
  componentId: string;
  linked: { boardId: string; name: string; note: string | null }[];
  boards: BoardOption[];
}) {
  const { pending, run } = useAction();
  const available = boards.filter((b) => !linked.some((l) => l.boardId === b.id));

  return (
    <div>
      {linked.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-2">
          {linked.map((l) => (
            <li key={l.boardId} className="flex items-center gap-2 rounded-sm border-l-2 border-primary bg-primary/10 py-1 pl-2.5 pr-1 text-sm">
              <span>
                {l.name}
                {l.note && <span className="text-muted-foreground"> ({l.note})</span>}
              </span>
              <button
                aria-label={`Quitar ${l.name}`}
                disabled={pending}
                onClick={() => run(() => unlinkBoard({ componentId, boardId: l.boardId }))}
                className="grid size-5 place-items-center rounded-sm text-muted-foreground hover:bg-danger/20 hover:text-danger"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {boards.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no hay placas. Cárgalas desde Ajustes.</p>
      ) : available.length > 0 ? (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            const boardId = String(data.get("boardId") ?? "");
            if (!boardId) return;
            run(() => linkBoard({ componentId, boardId, note: String(data.get("note") ?? "") }), { onSuccess: () => form.reset() });
          }}
        >
          <Select name="boardId" defaultValue="" aria-label="Placa" className="w-auto min-w-48 flex-1">
            <option value="" disabled>
              Elegir placa
            </option>
            {available.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <Input name="note" placeholder="Nota: requiere level shifter" aria-label="Nota de compatibilidad" className="min-w-40 flex-1" />
          <Button type="submit" variant="secondary" disabled={pending}>
            Marcar compatible
          </Button>
        </form>
      ) : null}
    </div>
  );
}
