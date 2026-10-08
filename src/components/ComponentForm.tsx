"use client";

import { createComponent, updateComponent } from "@/actions/components";
import { MOUNT_LABEL, MOUNT_TYPES } from "@/lib/enums";
import { formValues, useAction } from "@/lib/use-action";
import { Button } from "./ui/button";
import { DialogFooter } from "./ui/dialog";
import { Field, Input, Select, Textarea } from "./ui/form";

export type ComponentFormValues = {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  part_number: string | null;
  value: string | null;
  approximate_cost: number | null;
  unit: string;
  location: string | null;
  min_stock: number;
  description: string | null;
  image_url: string | null;
  datasheet_url: string | null;
  mount_type: string | null;
  package_type: string | null;
  manufacturer: string | null;
  barcode: string | null;
  auto_reorder: boolean;
  reorder_qty: number | null;
};

const PACKAGES = ["DIP-8", "DIP-14", "DIP-16", "DIP-28", "SOIC-8", "SOIC-14", "SOT-23", "TO-92", "TO-220", "TQFP-32", "0603", "0805", "1206", "Axial", "Radial"];

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <fieldset className="grid gap-4 sm:grid-cols-2">
    <legend className="mb-3 w-full border-b pb-1.5 font-display text-sm font-semibold text-primary">{title}</legend>
    {children}
  </fieldset>
);

/**
 * Crear y editar en un solo formulario (antes: dos archivos casi idénticos).
 * Recibe el componente por props: ya no hace fetch en useEffect al abrir.
 */
export function ComponentForm({
  component,
  categories,
  locations,
  onDone,
}: {
  component?: ComponentFormValues;
  categories: string[];
  locations: string[];
  onDone: () => void;
}) {
  const { pending, run } = useAction();
  const c = component;

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const values = formValues(e.currentTarget);
    run<unknown>(() => (c ? updateComponent({ ...values, id: c.id }) : createComponent(values)), {
      success: c ? "Cambios guardados" : "Componente creado",
      onSuccess: onDone,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <Section title="Identificación">
        <Field label="Nombre" className="sm:col-span-2">
          <Input name="name" required defaultValue={c?.name} placeholder="Compuerta AND" autoFocus={!c} />
        </Field>
        <Field label="Categoría">
          <Input name="category" required defaultValue={c?.category} list="cf-categories" placeholder="Circuitos Integrados" />
        </Field>
        <Field label="Subcategoría">
          <Input name="subcategory" defaultValue={c?.subcategory ?? ""} placeholder="Lógica TTL" />
        </Field>
        <Field label="Valor o descripción corta">
          <Input name="value" defaultValue={c?.value ?? ""} placeholder="Cuádruple, 2 entradas" />
        </Field>
        <Field label="Referencia">
          <Input name="part_number" defaultValue={c?.part_number ?? ""} placeholder="74LS08N" className="num" />
        </Field>
      </Section>

      <Section title="Encapsulado y documentación">
        <Field label="Montaje">
          <Select name="mount_type" defaultValue={c?.mount_type ?? ""}>
            <option value="">Sin definir</option>
            {MOUNT_TYPES.map((m) => (
              <option key={m} value={m}>
                {MOUNT_LABEL[m]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Encapsulado">
          <Input name="package_type" defaultValue={c?.package_type ?? ""} list="cf-packages" placeholder="DIP-14" className="num" />
        </Field>
        <Field label="Fabricante">
          <Input name="manufacturer" defaultValue={c?.manufacturer ?? ""} placeholder="Texas Instruments" />
        </Field>
        <Field label="Datasheet (enlace)">
          <Input name="datasheet_url" type="url" defaultValue={c?.datasheet_url ?? ""} placeholder="https://www.ti.com/lit/ds/…" />
        </Field>
      </Section>

      <Section title="Stock">
        {!c && (
          <Field label="Cantidad inicial">
            <Input name="current_quantity" type="number" min={0} defaultValue={0} className="num" />
          </Field>
        )}
        <Field label="Mínimo" hint="Por debajo de este número se considera bajo">
          <Input name="min_stock" type="number" min={0} defaultValue={c?.min_stock ?? 2} className="num" />
        </Field>
        <Field label="Unidad">
          <Select name="unit" defaultValue={c?.unit ?? "uds"}>
            <option value="uds">Unidades</option>
            <option value="m">Metros</option>
            <option value="cm">Centímetros</option>
            <option value="g">Gramos</option>
          </Select>
        </Field>
        <Field label="Cantidad a pedir" hint="Vacío: reponer hasta el doble del mínimo">
          <Input name="reorder_qty" type="number" min={1} defaultValue={c?.reorder_qty ?? ""} className="num" />
        </Field>
        <label className="flex items-start gap-3 rounded-[3px] border border-input bg-background/50 p-3 sm:col-span-2">
          <input type="checkbox" name="auto_reorder" defaultChecked={c?.auto_reorder ?? true} className="mt-0.5 size-4 accent-[var(--ion)]" />
          <span className="text-sm">
            Añadir a la wishlist cuando baje del mínimo
            <span className="block text-xs text-muted-foreground">Se crea un pedido con la cantidad a reponer en cuanto el stock cruza el umbral.</span>
          </span>
        </label>
      </Section>

      <Section title="Ubicación y costo">
        <Field label="Caja o gaveta">
          <Input name="location" defaultValue={c?.location ?? ""} list="cf-locations" placeholder="Caja Verde" />
        </Field>
        <Field label="Costo aproximado por unidad (COP)">
          <Input name="approximate_cost" type="number" min={0} step="any" defaultValue={c?.approximate_cost ?? ""} placeholder="2500" className="num" />
        </Field>
        <Field label="Código de barras de la bolsa" hint="También puedes vincularlo al escanear">
          <Input name="barcode" defaultValue={c?.barcode ?? ""} className="num" />
        </Field>
        <Field label="Imagen (enlace)">
          <Input name="image_url" type="url" defaultValue={c?.image_url ?? ""} placeholder="https://…" />
        </Field>
        <Field label="Notas" className="sm:col-span-2">
          <Textarea name="description" rows={2} defaultValue={c?.description ?? ""} />
        </Field>
      </Section>

      <datalist id="cf-categories">{categories.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="cf-locations">{locations.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="cf-packages">{PACKAGES.map((v) => <option key={v} value={v} />)}</datalist>

      <DialogFooter>
        <Button variant="ghost" onClick={onDone} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : c ? "Guardar cambios" : "Crear componente"}
        </Button>
      </DialogFooter>
    </form>
  );
}
