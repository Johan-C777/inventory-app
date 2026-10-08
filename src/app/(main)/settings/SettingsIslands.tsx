"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Upload } from "lucide-react";
import { createBoard, deleteBoard, seedEsp32Boards } from "@/actions/components";
import { clearHistory, resetDatabase } from "@/actions/system";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import { Input } from "@/components/ui/form";
import { formValues, useAction } from "@/lib/use-action";

export function ImportBackup() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const body = new FormData();
    body.append("file", file);
    try {
      const res = await fetch("/api/import-csv", { method: "POST", body });
      const data = await res.json();
      if (data.success) {
        toast.success(`${data.count} componentes importados`, { description: data.errors?.length ? `${data.errors.length} filas con errores` : undefined });
        router.refresh();
      } else toast.error(data.error ?? "No se pudo importar el archivo");
    } catch {
      toast.error("No se pudo subir el archivo. Revisa la conexión e intenta de nuevo.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  return (
    <label className="mt-4 inline-flex">
      <input type="file" accept=".xlsx,.csv" className="sr-only" disabled={busy} onChange={upload} />
      <span className="cut-sm inline-flex h-10 cursor-pointer items-center gap-2 bg-plate px-4 font-display text-sm font-semibold hover:bg-input">
        <Upload className="size-4" />
        {busy ? "Importando…" : "Elegir archivo"}
      </span>
    </label>
  );
}

type Board = { id: string; name: string; family: string; mcu: string | null; logic_voltage: number | null; notes: string | null };

export function BoardManager({ boards }: { boards: Board[] }) {
  const { pending, run } = useAction();
  return (
    <div>
      {boards.length > 0 && (
        <ul className="divide-y border-t">
          {boards.map((b) => (
            <li key={b.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
              <span className="min-w-0 flex-1">
                <span className="font-medium">{b.name}</span>
                {b.mcu && <span className="num ml-2 text-xs text-muted-foreground">{b.mcu}</span>}
                {b.notes && <span className="block truncate text-[13px] text-muted-foreground">{b.notes}</span>}
              </span>
              {b.logic_voltage != null && <span className="num text-[13px] text-muted-foreground">{b.logic_voltage} V</span>}
              <Button variant="ghost" size="icon-sm" aria-label={`Eliminar ${b.name}`} className="hover:text-danger" disabled={pending} onClick={() => run(() => deleteBoard({ id: b.id }))}>
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex flex-wrap gap-2 border-t p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          run(() => createBoard(formValues(form)), { success: "Placa añadida", onSuccess: () => form.reset() });
        }}
      >
        <Input name="name" required placeholder="Nombre: ESP32-S3 DevKitC-1" aria-label="Nombre de la placa" className="min-w-52 flex-[2]" />
        <Input name="family" required defaultValue="ESP32" aria-label="Familia" className="w-28" />
        <Input name="mcu" placeholder="Módulo: ESP32-S3-WROOM-1" aria-label="Módulo o MCU" className="min-w-44 flex-1" />
        <Input name="logic_voltage" type="number" step="0.1" min={0} placeholder="3.3 V" aria-label="Voltaje lógico" className="num w-24" />
        <Button type="submit" variant="secondary" disabled={pending}>
          <Plus />
          Añadir placa
        </Button>
        <Button variant="ghost" disabled={pending} onClick={() => run(() => seedEsp32Boards({}), { success: (d) => (d.count ? `${d.count} variantes de ESP32 cargadas` : "Ya estaban todas cargadas") })}>
          Cargar variantes de ESP32
        </Button>
      </form>
    </div>
  );
}

export function DangerZone() {
  const router = useRouter();
  const { pending, run } = useAction();
  const [open, setOpen] = useState<"history" | "all" | null>(null);

  return (
    <>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="warn" onClick={() => setOpen("history")}>
          Limpiar historial
        </Button>
        <Button variant="danger" onClick={() => setOpen("all")}>
          Borrar todo el inventario
        </Button>
      </div>

      <Confirm
        open={open === "history"}
        onOpenChange={(o) => !o && setOpen(null)}
        title="Limpiar historial"
        body="Se borran todos los movimientos y los préstamos ya cerrados. Los componentes, los proyectos y los préstamos activos se conservan."
        confirmLabel="Limpiar historial"
        tone="warn"
        phrase="LIMPIAR"
        pending={pending}
        onConfirm={() => run(() => clearHistory({ confirm: "LIMPIAR" }), { success: "Historial limpio", onSuccess: () => setOpen(null) })}
      />
      <Confirm
        open={open === "all"}
        onOpenChange={(o) => !o && setOpen(null)}
        title="Borrar todo el inventario"
        body="Se borran componentes, movimientos, préstamos, wishlist, proyectos y personas. Las placas se conservan."
        confirmLabel="Borrar todo"
        phrase="BORRAR TODO"
        pending={pending}
        onConfirm={() => run(() => resetDatabase({ confirm: "BORRAR TODO" }), { success: "Inventario borrado", onSuccess: () => { setOpen(null); router.push("/"); } })}
      />
    </>
  );
}
