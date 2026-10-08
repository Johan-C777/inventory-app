import Link from "next/link";
import { FolderKanban, Printer, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Empty, PageHeader, Panel } from "@/components/ui/panel";
import { fmtDateOnly } from "@/lib/format";
import { bomShortage, getBoards, getProjects } from "@/lib/queries";
import { kindOf, statusOf } from "./meta";
import { NewProjectButton } from "./ProjectIslands";

export const metadata = { title: "Proyectos" };

export default async function ProjectsPage() {
  const [projects, boards] = await Promise.all([getProjects(), getBoards()]);
  const boardOptions = boards.map(({ id, name }) => ({ id, name }));

  return (
    <>
      <PageHeader title="Proyectos" lead="Lista de materiales, placa y piezas impresas de cada proyecto. Aquí ves qué te falta antes de empezar a armar.">
        <NewProjectButton boards={boardOptions} />
      </PageHeader>

      {projects.length === 0 ? (
        <Panel>
          <Empty title="Aún no hay proyectos" icon={<FolderKanban />}>
            Crea uno para reservar componentes, anotar la placa que usa y llevar las iteraciones de las piezas impresas.
          </Empty>
        </Panel>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {projects.map((p) => {
            const kind = kindOf(p.kind);
            const status = statusOf(p.status);
            const missing = bomShortage(p);
            const printed = p.prints.filter((x) => x.status === "IMPRESA" || x.status === "VALIDADA").length;
            return (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`} className="group block h-full">
                  <Panel tone={missing ? "warn" : "default"} className="h-full p-5 transition-[filter] group-hover:brightness-125">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="cut-sm grid size-10 shrink-0 place-items-center bg-primary/12 text-primary">
                          <kind.icon className="size-5" />
                        </span>
                        <div className="min-w-0">
                          <h2 className="truncate text-base group-hover:text-primary">{p.name}</h2>
                          <p className="text-[13px] text-muted-foreground">{kind.label}</p>
                        </div>
                      </div>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </div>
                    {p.description && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
                      {p.board && <Badge tone="ion">{p.board.name}</Badge>}
                      <span className="text-muted-foreground">
                        {p.components.length} {p.components.length === 1 ? "componente" : "componentes"}
                      </span>
                      {p.prints.length > 0 && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Printer className="size-3.5" />
                          {printed}/{p.prints.length} piezas
                        </span>
                      )}
                      {missing > 0 && (
                        <span className="flex items-center gap-1 font-medium text-warn">
                          <TriangleAlert className="size-3.5" />
                          {missing} sin stock suficiente
                        </span>
                      )}
                      {p.due_date && <span className="ml-auto text-muted-foreground">Entrega {fmtDateOnly(p.due_date)}</span>}
                    </div>
                  </Panel>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
