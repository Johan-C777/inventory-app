"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { CalendarPlus, Check, Handshake, Plus, UserRound, X } from "lucide-react";
import { closeLoan, createLoan, extendLoan } from "@/actions/loans";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Segmented, Select, Textarea } from "@/components/ui/form";
import { Empty, Panel } from "@/components/ui/panel";
import { fmtDate, fmtDateOnly } from "@/lib/format";
import type { LoansPage } from "@/lib/queries";
import type { LoanState } from "@/lib/stock";
import { formValues, useAction } from "@/lib/use-action";
import { cn } from "@/lib/utils";

type Loan = LoansPage["loans"][number];
type Person = LoansPage["people"][number];
type ComponentOption = { id: string; name: string; value: string | null; unit: string; current_quantity: number };
type View = "active" | "overdue" | "closed";

const STATE: Record<LoanState, { label: string; tone: Tone }> = {
  overdue: { label: "Vencido", tone: "danger" },
  dueSoon: { label: "Por vencer", tone: "warn" },
  active: { label: "Prestado", tone: "accent" },
  returned: { label: "Devuelto", tone: "ok" },
  lost: { label: "Perdido", tone: "neutral" },
};
const ORDER: LoanState[] = ["overdue", "dueSoon", "active", "returned", "lost"];
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const addDays = (key: string, days: number) => new Date(Date.parse(key) + days * 86_400_000).toISOString().slice(0, 10);

function dueText(l: Loan) {
  if (l.state === "overdue") return `Venció hace ${plural(l.days, "día", "días")}`;
  if (l.state === "returned" || l.state === "lost") return l.actual_return_date ? `Cerrado el ${fmtDate(l.actual_return_date)}` : "Cerrado";
  if (!l.expected_return_date) return "Sin fecha de devolución";
  return l.days === 0 ? "Vuelve hoy" : `Vuelve en ${plural(l.days, "día", "días")} (${fmtDateOnly(l.expected_return_date)})`;
}

export default function LoansClient({
  loans,
  people,
  components,
  today,
  openNew,
}: {
  loans: Loan[];
  people: Person[];
  components: ComponentOption[];
  today: string;
  openNew: boolean;
}) {
  const { pending, run } = useAction();
  const [view, setView] = useState<View>("active");
  const [person, setPerson] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ person: string } | null>(openNew ? { person: "" } : null);
  const [losing, setLosing] = useState<Loan | null>(null);

  const counts = useMemo(
    () => ({
      active: loans.filter((l) => l.status === "PRESTADO").length,
      overdue: loans.filter((l) => l.state === "overdue").length,
      closed: loans.filter((l) => l.status !== "PRESTADO").length,
    }),
    [loans],
  );

  const visible = loans
    .filter((l) => (view === "active" ? l.status === "PRESTADO" : view === "overdue" ? l.state === "overdue" : l.status !== "PRESTADO"))
    .filter((l) => !person || l.person === person)
    .sort((a, b) => ORDER.indexOf(a.state) - ORDER.indexOf(b.state) || (a.state === "overdue" ? b.days - a.days : a.days - b.days));

  return (
    <>
      {/* Equipo: un toque filtra, el + presta a esa persona con el nombre ya puesto */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {people.map((p) => (
          <div key={p.id} className={cn("cut-sm flex items-center bg-hull/80 backdrop-blur", person === p.name && "bg-primary/15")}>
            <button onClick={() => setPerson(person === p.name ? null : p.name)} aria-pressed={person === p.name} className="flex h-11 items-center gap-2.5 pl-3 pr-2 text-sm">
              <span className="grid size-7 place-items-center bg-plate font-display text-xs font-bold text-primary">{p.name.slice(0, 2).toUpperCase()}</span>
              <span className="font-medium">{p.name}</span>
              {p.active > 0 ? <span className="num text-xs text-accent">{p.active} fuera</span> : <span className="text-xs text-muted-foreground">al día</span>}
            </button>
            <button onClick={() => setDraft({ person: p.name })} aria-label={`Prestar a ${p.name}`} className="grid size-11 place-items-center text-muted-foreground hover:text-primary">
              <Plus className="size-4" />
            </button>
          </div>
        ))}
        <Button onClick={() => setDraft({ person: "" })} className={cn(people.length > 0 && "ml-auto")}>
          <Handshake />
          Nuevo préstamo
        </Button>
      </div>

      <Panel tone={counts.overdue > 0 ? "danger" : "default"}>
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <Segmented
            label="Estado"
            value={view}
            onChange={setView}
            options={[
              { value: "active", label: "Activos", count: counts.active },
              { value: "overdue", label: "Vencidos", count: counts.overdue },
              { value: "closed", label: "Cerrados", count: counts.closed },
            ]}
          />
          {person && (
            <Badge tone="ion">
              <UserRound className="size-3" />
              {person}
              <button onClick={() => setPerson(null)} aria-label="Quitar filtro de persona">
                <X className="size-3" />
              </button>
            </Badge>
          )}
        </div>

        {visible.length === 0 ? (
          <Empty title={view === "overdue" ? "Ningún préstamo vencido" : view === "active" ? "Nadie tiene material prestado" : "Aún no hay préstamos cerrados"} icon={<Handshake />}>
            {view === "active" && "Registra un préstamo y aquí verás quién lo tiene y cuándo vuelve."}
          </Empty>
        ) : (
          <ul className="divide-y">
            <AnimatePresence initial={false}>
              {visible.map((l) => (
                <motion.li
                  key={l.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 40 }}
                  transition={{ type: "spring", stiffness: 480, damping: 38 }}
                  className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5", l.state === "overdue" && "bg-danger/[0.06]")}
                >
                  <span className={cn("h-10 w-1 shrink-0", l.state === "overdue" ? "animate-alarm bg-danger" : l.state === "dueSoon" ? "bg-warn" : l.status === "PRESTADO" ? "bg-accent" : "bg-input")} />
                  <div className="min-w-[180px] flex-1">
                    <p className="font-medium">
                      {l.person}
                      <span className="font-normal text-muted-foreground"> tiene </span>
                      <span className="num">
                        {l.quantity} {l.component.unit}
                      </span>
                      <span className="font-normal text-muted-foreground"> de </span>
                      <Link href={`/inventory/${l.component.id}`} className="hover:text-primary">
                        {l.component.name}
                      </Link>
                    </p>
                    <p className={cn("text-[13px]", l.state === "overdue" ? "text-danger" : "text-muted-foreground")}>
                      {dueText(l)}
                      {l.notes && <span className="text-muted-foreground"> · {l.notes}</span>}
                    </p>
                  </div>
                  <Badge tone={STATE[l.state].tone}>{STATE[l.state].label}</Badge>
                  {l.status === "PRESTADO" && (
                    <div className="flex gap-1">
                      <Button variant="ok" size="sm" disabled={pending} onClick={() => run(() => closeLoan({ id: l.id, outcome: "DEVUELTO" }), { success: `${l.component.name} volvió al stock` })}>
                        <Check />
                        Devuelto
                      </Button>
                      <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => extendLoan({ id: l.id, days: 7 }), { success: "Plazo ampliado una semana" })}>
                        <CalendarPlus />
                        +7 días
                      </Button>
                      <Button variant="ghost" size="sm" className="hover:text-danger" disabled={pending} onClick={() => setLosing(l)}>
                        Perdido
                      </Button>
                    </div>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Panel>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)} title="Nuevo préstamo">
        {draft && <LoanForm key={draft.person} person={draft.person} people={people} components={components} today={today} onDone={() => setDraft(null)} />}
      </Dialog>

      <Confirm
        open={!!losing}
        onOpenChange={(o) => !o && setLosing(null)}
        title="Dar por perdido"
        body={losing && `${losing.quantity} ${losing.component.unit} de ${losing.component.name} que tiene ${losing.person}. El stock no se repone.`}
        confirmLabel="Marcar como perdido"
        pending={pending}
        onConfirm={() => losing && run(() => closeLoan({ id: losing.id, outcome: "PERDIDO" }), { success: "Préstamo marcado como perdido", onSuccess: () => setLosing(null) })}
      />
    </>
  );
}

const TERMS = [
  { label: "3 días", days: 3 },
  { label: "1 semana", days: 7 },
  { label: "2 semanas", days: 14 },
  { label: "1 mes", days: 30 },
];

function LoanForm({ person, people, components, today, onDone }: { person: string; people: Person[]; components: ComponentOption[]; today: string; onDone: () => void }) {
  const { pending, run } = useAction();
  const [componentId, setComponentId] = useState("");
  const [due, setDue] = useState(addDays(today, 7)); // con fecha por defecto, todo préstamo puede vencer y avisar
  const selected = components.find((c) => c.id === componentId);

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => createLoan(formValues(e.currentTarget)), { success: "Préstamo registrado", onSuccess: onDone });
      }}
    >
      <Field label="A quién" className="sm:col-span-2">
        <Input name="person" required defaultValue={person} list="loan-people" placeholder="Juan" autoFocus={!person} autoComplete="off" />
        <datalist id="loan-people">{people.map((p) => <option key={p.id} value={p.name} />)}</datalist>
      </Field>
      <Field label="Componente" className="sm:col-span-2">
        <Select name="component_id" required value={componentId} onChange={(e) => setComponentId(e.target.value)}>
          <option value="" disabled>
            Elegir componente
          </option>
          {components.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.value ?? ""} ({c.current_quantity} {c.unit})
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Cantidad" hint={selected ? `Hay ${selected.current_quantity} ${selected.unit}` : undefined}>
        <Input name="quantity" type="number" min={1} max={selected?.current_quantity} defaultValue={1} required className="num" />
      </Field>
      <Field label="Vuelve el">
        <Input name="expected_return_date" type="date" min={today} value={due} onChange={(e) => setDue(e.target.value)} className="num" />
      </Field>
      <div className="flex flex-wrap gap-1.5 sm:col-span-2">
        {TERMS.map((t) => {
          const value = addDays(today, t.days);
          return (
            <button
              key={t.days}
              type="button"
              onClick={() => setDue(value)}
              className={cn("rounded-sm border px-2.5 py-1 text-[13px] font-medium", due === value ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground hover:text-foreground")}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <Field label="Contacto" hint="WhatsApp o correo, para saber a quién escribir">
        <Input name="contact" defaultValue={people.find((p) => p.name === person)?.contact ?? ""} />
      </Field>
      <Field label="Nota">
        <Textarea name="notes" rows={1} placeholder="Para el proyecto de robótica" />
      </Field>
      <div className="sm:col-span-2">
        <DialogFooter>
          <Button variant="ghost" onClick={onDone}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Registrando…" : "Registrar préstamo"}
          </Button>
        </DialogFooter>
      </div>
    </form>
  );
}
