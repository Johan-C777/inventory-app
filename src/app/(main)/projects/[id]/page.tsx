import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink, GitBranch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Empty, Panel, PanelHeader } from "@/components/ui/panel";
import { fmtDateOnly, num } from "@/lib/format";
import { getBoards, getComponentIndex, getProject } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { kindOf, printOf, statusOf } from "../meta";
import { BomAdder, BomRowActions, ConsumeBomButton, PrintPartActions, PrintPartAdder, ProjectMenu } from "../ProjectIslands";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const p = await getProject((await params).id);
  return { title: p?.name ?? "Proyecto" };
}

export default async function ProjectPage({ params }: { params: Params }) {
  const { id } = await params;
  const [p, boards, index] = await Promise.all([getProject(id), getBoards(), getComponentIndex()]);
  if (!p) notFound();

  const kind = kindOf(p.kind);
  const status = statusOf(p.status);
  const inBom = new Set(p.components.map((pc) => pc.component_id));
  const short = p.components.filter((pc) => pc.component.current_quantity < pc.quantity);
  const grams = p.prints.reduce((s, x) => s + (x.filament_grams ?? 0) * x.quantity, 0);
  const minutes = p.prints.reduce((s, x) => s + (x.print_minutes ?? 0) * x.quantity, 0);

  return (
    <div className="grid gap-5 xl:grid-cols-12">
      <div className="xl:col-span-12">
        <Link href="/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ChevronLeft className="size-4" />
          Proyectos
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[28px] leading-tight">{p.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <Badge tone={status.tone}>{status.label}</Badge>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <kind.icon className="size-4" />
                {kind.label}
              </span>
              {p.board && <Badge tone="ion">{p.board.name}</Badge>}
              {p.due_date && <span className="text-muted-foreground">Entrega el {fmtDateOnly(p.due_date)}</span>}
            </div>
            {p.description && <p className="mt-3 max-w-[70ch] text-muted-foreground">{p.description}</p>}
            {p.board?.notes && <p className="mt-1 max-w-[70ch] text-[13px] text-muted-foreground">{p.board.name}: {p.board.notes}</p>}
          </div>
          <div className="flex items-center gap-2">
            {p.repo_url && (
              <a href={p.repo_url} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "secondary" })}>
                <GitBranch />
                Repositorio
              </a>
            )}
            <ProjectMenu
              project={{ id: p.id, name: p.name, description: p.description, kind: p.kind, status: p.status, board_id: p.board_id, repo_url: p.repo_url, due_date: p.due_date }}
              boards={boards.map(({ id, name }) => ({ id, name }))}
            />
          </div>
        </div>
      </div>

      <Panel className="xl:col-span-7" tone={short.length ? "warn" : "default"}>
        <PanelHeader
          title="Lista de materiales"
          hint={
            p.components.length === 0
              ? undefined
              : short.length
                ? `Falta stock en ${short.length} de ${p.components.length} líneas`
                : "Hay stock para armarlo completo"
          }
          action={<ConsumeBomButton projectId={p.id} lines={p.components.length} blocked={short.length > 0} />}
        />
        {p.components.length === 0 ? (
          <Empty title="Lista vacía">Busca abajo los componentes que usa este proyecto.</Empty>
        ) : (
          <ul className="divide-y">
            {p.components.map((pc) => {
              const missing = pc.quantity - pc.component.current_quantity;
              return (
                <li key={pc.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                  <span className="num w-10 shrink-0 font-semibold text-primary">{pc.quantity}×</span>
                  <Link href={`/inventory/${pc.component.id}`} className="min-w-0 flex-1 hover:text-primary">
                    <span className="block truncate font-medium">
                      {pc.component.name} <span className="font-normal text-muted-foreground">{pc.component.value}</span>
                    </span>
                    {pc.component.part_number && <span className="num block text-xs text-muted-foreground">{pc.component.part_number}</span>}
                  </Link>
                  <span className={cn("num whitespace-nowrap text-[13px]", missing > 0 ? "font-medium text-warn" : "text-muted-foreground")}>
                    {missing > 0 ? `faltan ${missing}` : `hay ${pc.component.current_quantity}`}
                  </span>
                  <BomRowActions projectId={p.id} componentId={pc.component.id} name={pc.component.name} />
                </li>
              );
            })}
          </ul>
        )}
        <BomAdder
          projectId={p.id}
          options={index.filter((c) => !inBom.has(c.id)).map(({ id, name, value, part_number, unit, current_quantity }) => ({ id, name, value, part_number, unit, current_quantity }))}
        />
      </Panel>

      <Panel className="xl:col-span-5">
        <PanelHeader
          title="Piezas impresas"
          hint={p.prints.length ? `${num(Math.round(grams))} g de filamento, ${Math.floor(minutes / 60)} h ${minutes % 60} min de impresión` : undefined}
          action={<PrintPartAdder projectId={p.id} lastPrinter={p.prints[0]?.printer ?? null} />}
        />
        {p.prints.length === 0 ? (
          <Empty title="Sin piezas todavía">Registra cada pieza con su material y parámetros. Cada reimpresión de prueba queda como una iteración nueva.</Empty>
        ) : (
          <ul className="divide-y">
            {p.prints.map((x) => (
              <li key={x.id} className="px-5 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="num grid h-6 min-w-8 place-items-center bg-plate px-1.5 text-xs font-bold text-primary">v{x.iteration}</span>
                  <span className="font-medium">{x.name}</span>
                  {x.quantity > 1 && <span className="num text-[13px] text-muted-foreground">× {x.quantity}</span>}
                  <Badge tone={printOf(x.status).tone} className="ml-auto">
                    {printOf(x.status).label}
                  </Badge>
                </div>
                <p className="mt-1 flex flex-wrap gap-x-3 text-[13px] text-muted-foreground">
                  {x.printer && <span>{x.printer}</span>}
                  {x.material && <span>{x.material}</span>}
                  {x.filament_grams != null && <span className="num">{x.filament_grams} g</span>}
                  {x.print_minutes != null && <span className="num">{x.print_minutes} min</span>}
                  {x.file_url && (
                    <a href={x.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                      Archivo <ExternalLink className="size-3" />
                    </a>
                  )}
                </p>
                {x.notes && <p className="mt-1 text-[13px]">{x.notes}</p>}
                <div className="mt-2">
                  <PrintPartActions id={x.id} name={x.name} status={x.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
