import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ExternalLink, FileText, Printer } from "lucide-react";
import { Badge, LevelBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Empty, Panel, PanelHeader } from "@/components/ui/panel";
import { StockMeter } from "@/components/ui/stock-meter";
import { QuickWishlistButton } from "@/components/wishlist-buttons";
import { isOneOf, MOUNT_LABEL, MOUNT_TYPES } from "@/lib/enums";
import { cop, fmtDateOnly, fmtDateYear, fmtTime } from "@/lib/format";
import { appOrigin } from "@/lib/origin";
import { getBoards, getComponent, getComponentIndex } from "@/lib/queries";
import { boxColor, MOVEMENT_LABEL, signedDelta, stockLevel } from "@/lib/stock";
import { cn } from "@/lib/utils";
import { BoardLinks, ComponentMenu, StockControls } from "./ComponentIslands";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const c = await getComponent((await params).id);
  return { title: c?.name ?? "Componente" };
}


/** Stock tras cada movimiento, reconstruido desde la cantidad actual hacia atrás. */
function history(current: number, movements: { type: string; quantity: number }[]) {
  const points = [current];
  for (const m of movements) points.push(points[points.length - 1] - signedDelta(m.type, m.quantity));
  return points.reverse();
}

function Sparkline({ points, min }: { points: number[]; min: number }) {
  const W = 320;
  const H = 64;
  const max = Math.max(...points, min, 1);
  const x = (i: number) => (points.length === 1 ? W : (i / (points.length - 1)) * W);
  const y = (v: number) => H - 4 - (v / max) * (H - 8);
  // Escalonado: el stock cambia de golpe en cada movimiento
  const d = points.map((p, i) => (i === 0 ? `M0,${y(p).toFixed(1)}` : `H${x(i).toFixed(1)}V${y(p).toFixed(1)}`)).join("");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-16 w-full" role="img" aria-label="Evolución del stock">
      <line x1={0} x2={W} y1={y(min)} y2={y(min)} stroke="var(--warn)" strokeWidth={1} strokeDasharray="4 4" opacity={0.6} />
      <path d={d} fill="none" stroke="var(--ion)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// Ficha completa como Server Component. Es también el destino del QR de la etiqueta:
// la cámara del teléfono abre esta página sin pasar por el escáner de la app.
export default async function ComponentPage({ params }: { params: Params }) {
  const { id } = await params;
  const [c, boards, index, origin] = await Promise.all([getComponent(id), getBoards(), getComponentIndex(), appOrigin()]);
  if (!c) notFound();

  const level = stockLevel(c.current_quantity, c.min_stock);
  const url = `${origin}/inventory/${c.id}`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  const points = history(c.current_quantity, c.movements);
  const categories = [...new Set(index.map((i) => i.category))].sort();
  const locations = [...new Set(index.map((i) => i.location).filter((l): l is string => !!l))].sort();
  const activeLoans = c.loans.filter((l) => l.status === "PRESTADO");

  // Al cliente solo viajan los campos del formulario, no la ficha con todo su historial
  const formValues = {
    id: c.id, name: c.name, category: c.category, subcategory: c.subcategory, part_number: c.part_number, value: c.value,
    approximate_cost: c.approximate_cost, unit: c.unit, location: c.location, min_stock: c.min_stock, description: c.description,
    image_url: c.image_url, datasheet_url: c.datasheet_url, mount_type: c.mount_type, package_type: c.package_type,
    manufacturer: c.manufacturer, barcode: c.barcode, auto_reorder: c.auto_reorder, reorder_qty: c.reorder_qty,
  };

  const specs = [
    ["Referencia", c.part_number],
    ["Fabricante", c.manufacturer],
    ["Montaje", isOneOf(MOUNT_TYPES, c.mount_type) ? MOUNT_LABEL[c.mount_type] : c.mount_type],
    ["Encapsulado", c.package_type],
    ["Subcategoría", c.subcategory],
    ["Costo por unidad", c.approximate_cost != null ? cop(c.approximate_cost) : null],
    ["Valor en stock", c.approximate_cost != null ? cop(c.approximate_cost * c.current_quantity) : null],
    ["Código de bolsa", c.barcode],
  ].filter((s): s is [string, string] => !!s[1]);

  return (
    <div className="grid gap-5 xl:grid-cols-12">
      <div className="xl:col-span-12">
        <Link href="/inventory" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ChevronLeft className="size-4" />
          Inventario
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[28px] leading-tight">{c.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {c.value && <span className="text-muted-foreground">{c.value}</span>}
              <Badge>{c.category}</Badge>
              {c.package_type && <Badge tone="ion">{c.package_type}</Badge>}
              {c.location && (
                <span className="flex items-center gap-2 text-sm">
                  <span className="size-2.5" style={{ background: boxColor(c.location) }} />
                  {c.location}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {c.datasheet_url && (
              <a href={c.datasheet_url} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "secondary" })}>
                <FileText />
                Datasheet
              </a>
            )}
            <ComponentMenu component={formValues} categories={categories} locations={locations} />
          </div>
        </div>
      </div>

      <Panel className="xl:col-span-8" tone={level === "out" ? "danger" : level === "low" ? "warn" : "default"}>
        <div className="grid gap-6 p-6 md:grid-cols-[auto_1fr] md:items-center">
          <div>
            <p className="text-[13px] text-muted-foreground">En stock</p>
            <p className={cn("num text-7xl font-bold leading-none", level === "out" ? "text-danger" : level === "low" ? "text-warn" : "text-foreground")}>
              {c.current_quantity}
              <span className="ml-2 text-xl font-medium text-muted-foreground">{c.unit}</span>
            </p>
            <div className="mt-3 flex items-center gap-2">
              <LevelBadge level={level} />
              <span className="text-sm text-muted-foreground">mínimo {c.min_stock}</span>
            </div>
          </div>
          <div className="min-w-0">
            <Sparkline points={points} min={c.min_stock} />
            <StockMeter qty={c.current_quantity} min={c.min_stock} className="mt-2 h-2.5" />
            <p className="mt-2 text-xs text-muted-foreground">
              La línea punteada es el mínimo.{" "}
              {c.auto_reorder ? "Al cruzarla entra solo a la wishlist." : "El pedido automático está apagado para este componente."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4 border-t p-6">
          <StockControls id={c.id} name={c.name} unit={c.unit} quantity={c.current_quantity} />
          {level !== "ok" && <QuickWishlistButton componentId={c.id} ordered={c.wishlist.length > 0} />}
        </div>
      </Panel>

      <Panel className="xl:col-span-4">
        <PanelHeader title="Etiqueta QR" hint="Pégala en la bolsa o gaveta" />
        <div className="flex items-center gap-4 px-5 pb-5">
          <div className="size-28 shrink-0 bg-white p-1 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: qr }} />
          <div className="min-w-0 text-sm text-muted-foreground">
            <p>La cámara del teléfono abre esta ficha. Con el escáner de la app suma o descuenta en una lectura.</p>
            <Link href={`/labels?ids=${c.id}`} className="mt-2 inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
              <Printer className="size-4" />
              Imprimir etiqueta
            </Link>
          </div>
        </div>
      </Panel>

      <Panel className="xl:col-span-5">
        <PanelHeader title="Ficha técnica" />
        {specs.length === 0 && !c.description ? (
          <Empty title="Sin datos técnicos">Edita el componente para añadir referencia, encapsulado y datasheet.</Empty>
        ) : (
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 px-5 pb-5 text-sm">
            {specs.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="num min-w-0 truncate">{v}</dd>
              </div>
            ))}
            {c.description && (
              <div className="contents">
                <dt className="text-muted-foreground">Notas</dt>
                <dd>{c.description}</dd>
              </div>
            )}
          </dl>
        )}
        {c.image_url && (
          // eslint-disable-next-line @next/next/no-img-element -- hosts arbitrarios, sin optimizador
          <img src={c.image_url} alt={c.name} loading="lazy" className="mx-5 mb-5 max-h-48 rounded-sm object-contain" />
        )}
      </Panel>

      <Panel className="xl:col-span-7">
        <PanelHeader title="Placas compatibles" hint="Con qué microcontroladores lo has probado" />
        <div className="px-5 pb-5">
          <BoardLinks
            componentId={c.id}
            boards={boards.map(({ id, name, family }) => ({ id, name, family }))}
            linked={c.boards.map((b) => ({ boardId: b.board_id, name: b.board.name, note: b.note }))}
          />
        </div>
        <div className="border-t">
          <PanelHeader title="En proyectos" />
          {c.projects.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted-foreground">No está en la lista de materiales de ningún proyecto.</p>
          ) : (
            <ul className="divide-y">
              {c.projects.map((p) => (
                <li key={p.id}>
                  <Link href={`/projects/${p.project.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm hover:bg-plate">
                    <span className="font-medium">{p.project.name}</span>
                    <span className="num text-muted-foreground">
                      {p.quantity} {c.unit}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      <Panel className="xl:col-span-7">
        <PanelHeader title="Movimientos" hint={c.movements.length === 60 ? "Últimos 60" : undefined} />
        {c.movements.length === 0 ? (
          <Empty title="Sin movimientos">Las entradas y salidas de este componente aparecerán aquí.</Empty>
        ) : (
          <ul className="max-h-[420px] divide-y overflow-y-auto">
            {c.movements.map((m) => {
              const delta = signedDelta(m.type, m.quantity);
              return (
                <li key={m.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                  <span className={cn("grid size-7 shrink-0 place-items-center rounded-sm", delta > 0 ? "bg-ok/12 text-ok" : "bg-accent/12 text-accent")}>
                    {delta > 0 ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{MOVEMENT_LABEL[m.type] ?? m.type}</span>
                    {m.notes && <span className="text-muted-foreground"> · {m.notes}</span>}
                  </span>
                  <span className={cn("num font-semibold", delta > 0 && "text-ok")}>
                    {delta > 0 ? "+" : "−"}
                    {Math.abs(delta)}
                  </span>
                  <span className="w-28 text-right text-xs text-muted-foreground">
                    {fmtDateYear(m.date)} {fmtTime(m.date)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel className="xl:col-span-5">
        <PanelHeader
          title="Préstamos"
          action={activeLoans.length > 0 && <Badge tone="accent">{activeLoans.reduce((s, l) => s + l.quantity, 0)} fuera</Badge>}
        />
        {c.loans.length === 0 ? (
          <Empty title="Nunca se ha prestado" />
        ) : (
          <ul className="divide-y">
            {c.loans.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="font-medium">{l.person}</span>
                  <span className="block text-[13px] text-muted-foreground">
                    {fmtDateYear(l.loan_date)}
                    {l.expected_return_date && l.status === "PRESTADO" && `, vuelve el ${fmtDateOnly(l.expected_return_date)}`}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="num">
                    {l.quantity} {c.unit}
                  </span>
                  <Badge tone={l.status === "PRESTADO" ? "accent" : l.status === "DEVUELTO" ? "ok" : "danger"}>
                    {l.status === "PRESTADO" ? "Prestado" : l.status === "DEVUELTO" ? "Devuelto" : "Perdido"}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/loans?new=1" className="flex items-center gap-1.5 border-t px-5 py-3 text-sm font-medium text-primary hover:bg-plate">
          <ExternalLink className="size-4" />
          Prestar este componente
        </Link>
      </Panel>
    </div>
  );
}
