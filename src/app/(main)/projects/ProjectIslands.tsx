"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CopyPlus, PackageMinus, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { consumeBom, deletePrintPart, deleteProject, iteratePrintPart, linkComponent, savePrintPart, saveProject, setPrintStatus, unlinkComponent } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import type { PrintStatus } from "@/lib/enums";
import { formValues, useAction } from "@/lib/use-action";
import { KIND, PRINT, STATUS } from "./meta";

type BoardOption = { id: string; name: string };
type ProjectValues = { id: string; name: string; description: string | null; kind: string; status: string; board_id: string | null; repo_url: string | null; due_date: Date | null };

function ProjectForm({ project, boards, onDone }: { project?: ProjectValues; boards: BoardOption[]; onDone: (id: string) => void }) {
  const { pending, run } = useAction();
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const values = formValues(e.currentTarget);
        run(() => saveProject(project ? { ...values, id: project.id } : values), { success: project ? "Proyecto actualizado" : "Proyecto creado", onSuccess: (d) => onDone(d.id) });
      }}
    >
      <Field label="Nombre" className="sm:col-span-2">
        <Input name="name" required defaultValue={project?.name} placeholder="Seguidor de línea" autoFocus={!project} />
      </Field>
      <Field label="Tipo">
        <Select name="kind" defaultValue={project?.kind ?? "ELECTRONICO"}>
          {Object.entries(KIND).map(([v, k]) => (
            <option key={v} value={v}>
              {k.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Estado">
        <Select name="status" defaultValue={project?.status ?? "ACTIVO"}>
          {Object.entries(STATUS).map(([v, s]) => (
            <option key={v} value={v}>
              {s.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Placa principal" hint={boards.length ? undefined : "Carga las variantes de ESP32 desde Ajustes"}>
        <Select name="board_id" defaultValue={project?.board_id ?? ""}>
          <option value="">Sin placa</option>
          {boards.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Fecha de entrega">
        <Input name="due_date" type="date" defaultValue={project?.due_date?.toISOString().slice(0, 10) ?? ""} className="num" />
      </Field>
      <Field label="Repositorio (enlace)" className="sm:col-span-2">
        <Input name="repo_url" type="url" defaultValue={project?.repo_url ?? ""} placeholder="https://github.com/…" />
      </Field>
      <Field label="Descripción" className="sm:col-span-2">
        <Textarea name="description" rows={2} defaultValue={project?.description ?? ""} />
      </Field>
      <div className="sm:col-span-2">
        <DialogFooter>
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : project ? "Guardar cambios" : "Crear proyecto"}
          </Button>
        </DialogFooter>
      </div>
    </form>
  );
}

export function NewProjectButton({ boards }: { boards: BoardOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus />
        Nuevo proyecto
      </Button>
      <Dialog open={open} onOpenChange={setOpen} title="Nuevo proyecto">
        <ProjectForm boards={boards} onDone={(id) => router.push(`/projects/${id}`)} />
      </Dialog>
    </>
  );
}

export function ProjectMenu({ project, boards }: { project: ProjectValues; boards: BoardOption[] }) {
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
      <Button variant="ghost" size="icon" aria-label="Eliminar proyecto" className="hover:text-danger" onClick={() => setRemoving(true)}>
        <Trash2 />
      </Button>
      <Dialog open={editing} onOpenChange={setEditing} title="Editar proyecto">
        <ProjectForm project={project} boards={boards} onDone={() => setEditing(false)} />
      </Dialog>
      <Confirm
        open={removing}
        onOpenChange={setRemoving}
        title={`Eliminar ${project.name}`}
        body="Se borran su lista de materiales y sus piezas impresas. El stock no cambia."
        confirmLabel="Eliminar proyecto"
        pending={pending}
        onConfirm={() => run(() => deleteProject({ id: project.id }), { success: "Proyecto eliminado", onSuccess: () => router.push("/projects") })}
      />
    </>
  );
}

type Option = { id: string; name: string; value: string | null; part_number: string | null; unit: string; current_quantity: number };

/** Buscador para añadir líneas a la lista de materiales. */
export function BomAdder({ projectId, options }: { projectId: string; options: Option[] }) {
  const { pending, run } = useAction();
  const [q, setQ] = useState("");
  const [qty, setQty] = useState(1);
  const term = q.trim().toLowerCase();
  const matches = term ? options.filter((c) => `${c.name} ${c.value ?? ""} ${c.part_number ?? ""}`.toLowerCase().includes(term)).slice(0, 6) : [];

  return (
    <div className="border-t p-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Añadir componente a la lista" aria-label="Buscar componente" className="pl-9" />
        </div>
        <Input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} aria-label="Cantidad" className="num w-20 text-center" />
      </div>
      {term && (
        <ul className="mt-2 divide-y rounded-[3px] border border-input bg-background/60">
          {matches.length === 0 && <li className="px-3 py-3 text-sm text-muted-foreground">Ningún componente coincide o ya está en la lista.</li>}
          {matches.map((c) => (
            <li key={c.id}>
              <button
                disabled={pending}
                onClick={() => run(() => linkComponent({ projectId, componentId: c.id, quantity: qty }), { onSuccess: () => { setQ(""); setQty(1); } })}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-plate"
              >
                <Plus className="size-4 text-primary" />
                <span className="min-w-0 flex-1 truncate">
                  {c.name} <span className="text-muted-foreground">{c.value}</span>
                </span>
                <span className="num text-xs text-muted-foreground">
                  hay {c.current_quantity} {c.unit}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function BomRowActions({ projectId, componentId, name }: { projectId: string; componentId: string; name: string }) {
  const { pending, run } = useAction();
  return (
    <Button variant="ghost" size="icon-sm" aria-label={`Quitar ${name} del proyecto`} className="hover:text-danger" disabled={pending} onClick={() => run(() => unlinkComponent({ projectId, componentId }))}>
      <X />
    </Button>
  );
}

export function ConsumeBomButton({ projectId, lines, blocked }: { projectId: string; lines: number; blocked: boolean }) {
  const { pending, run } = useAction();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="warn" disabled={lines === 0 || blocked} onClick={() => setOpen(true)}>
        <PackageMinus />
        Descontar del stock
      </Button>
      <Confirm
        open={open}
        onOpenChange={setOpen}
        title="Descontar la lista de materiales"
        body={`Se descuentan del inventario los ${lines} componentes de la lista, cada uno con su cantidad. Úsalo cuando armes el proyecto.`}
        confirmLabel="Descontar"
        tone="warn"
        pending={pending}
        onConfirm={() => run(() => consumeBom({ projectId }), { success: (d) => `${d.lines} componentes descontados del stock`, onSuccess: () => setOpen(false) })}
      />
    </>
  );
}

const MATERIALS = ["PLA", "PLA+", "PETG", "ABS", "ASA", "TPU", "PA-CF"];

export function PrintPartAdder({ projectId, lastPrinter }: { projectId: string; lastPrinter: string | null }) {
  const { pending, run } = useAction();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Plus />
        Añadir pieza
      </Button>
      <Dialog open={open} onOpenChange={setOpen} title="Nueva pieza impresa" description="Para piezas de prueba, crea la primera versión y luego usa Nueva iteración.">
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => savePrintPart({ ...formValues(e.currentTarget), project_id: projectId }), { success: "Pieza añadida", onSuccess: () => setOpen(false) });
          }}
        >
          <Field label="Pieza" className="sm:col-span-2">
            <Input name="name" required placeholder="Soporte de motor, prueba de tolerancia" autoFocus />
          </Field>
          <Field label="Impresora">
            <Input name="printer" defaultValue={lastPrinter ?? ""} placeholder="Creality K1C" />
          </Field>
          <Field label="Material">
            <Input name="material" list="pp-materials" placeholder="PETG" />
            <datalist id="pp-materials">{MATERIALS.map((m) => <option key={m} value={m} />)}</datalist>
          </Field>
          <Field label="Copias">
            <Input name="quantity" type="number" min={1} defaultValue={1} className="num" />
          </Field>
          <Field label="Filamento (g)">
            <Input name="filament_grams" type="number" min={0} step="any" className="num" />
          </Field>
          <Field label="Tiempo (min)">
            <Input name="print_minutes" type="number" min={0} className="num" />
          </Field>
          <Field label="Archivo (enlace al STL o 3MF)">
            <Input name="file_url" type="url" placeholder="https://…" />
          </Field>
          <Field label="Notas" className="sm:col-span-2">
            <Textarea name="notes" rows={2} placeholder="Capa 0.2, relleno 30 %, holgura 0.15 mm" />
          </Field>
          <div className="sm:col-span-2">
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                Añadir pieza
              </Button>
            </DialogFooter>
          </div>
        </form>
      </Dialog>
    </>
  );
}

export function PrintPartActions({ id, name, status }: { id: string; name: string; status: string }) {
  const { pending, run } = useAction();
  return (
    <div className="flex items-center gap-1">
      <Select
        value={status}
        disabled={pending}
        onChange={(e) => run(() => setPrintStatus({ id, status: e.target.value as PrintStatus }))}
        aria-label={`Estado de ${name}`}
        className="h-8 w-auto text-[13px]"
      >
        {Object.entries(PRINT).map(([v, p]) => (
          <option key={v} value={v}>
            {p.label}
          </option>
        ))}
      </Select>
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => iteratePrintPart({ id }), { success: "Nueva iteración creada" })}>
        <CopyPlus />
        Nueva iteración
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label={`Eliminar ${name}`} className="hover:text-danger" disabled={pending} onClick={() => run(() => deletePrintPart({ id }))}>
        <Trash2 />
      </Button>
    </div>
  );
}
