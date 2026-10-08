import { BellRing, CircuitBoard, Database, ShieldAlert, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/panel";
import prisma from "@/lib/prisma";
import { getBoards } from "@/lib/queries";
import { BoardManager, DangerZone, ImportBackup } from "./SettingsIslands";

export const metadata = { title: "Ajustes" };

const Icon = ({ children, tone = "primary" }: { children: React.ReactNode; tone?: "primary" | "danger" }) => (
  <span className={`cut-sm grid size-10 shrink-0 place-items-center [&_svg]:size-5 ${tone === "danger" ? "bg-danger/12 text-danger" : "bg-primary/12 text-primary"}`}>{children}</span>
);

export default async function SettingsPage() {
  const [boards, people] = await Promise.all([getBoards(), prisma.person.count()]);
  const webhook = Boolean(process.env.NOTIFY_WEBHOOK_URL);
  const cron = Boolean(process.env.CRON_SECRET);

  return (
    <>
      <PageHeader title="Ajustes" lead="Copias de seguridad, placas, avisos automáticos y borrado de datos." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <div className="flex gap-4 p-5">
            <Icon>
              <Database />
            </Icon>
            <div>
              <h2 className="text-base">Exportar copia</h2>
              <p className="mt-1 text-sm text-muted-foreground">Un Excel con componentes, movimientos, préstamos, wishlist, proyectos, placas y piezas impresas.</p>
              <a href="/api/export-csv" className={buttonVariants({ className: "mt-4" })}>
                Descargar Excel
              </a>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="flex gap-4 p-5">
            <Icon>
              <Upload />
            </Icon>
            <div className="min-w-0 flex-1">
              <h2 className="text-base">Restaurar o importar</h2>
              <p className="mt-1 text-sm text-muted-foreground">Sube una copia .xlsx o un CSV de componentes. Lo que ya existe se actualiza por su id.</p>
              <ImportBackup />
            </div>
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Placas y microcontroladores"
            hint="Se usan para marcar compatibilidad en cada componente y como placa principal de un proyecto"
            action={
              <Icon>
                <CircuitBoard />
              </Icon>
            }
          />
          <BoardManager boards={boards} />
        </Panel>

        <Panel className="lg:col-span-2">
          <div className="flex gap-4 p-5">
            <Icon>
              <BellRing />
            </Icon>
            <div className="min-w-0 flex-1">
              <h2 className="text-base">Avisos de préstamos vencidos</h2>
              <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">
                Cada mañana un cron revisa los préstamos vencidos y manda un resumen a tu canal de Discord (u otro webhook). Dentro de la app las
                alertas funcionan siempre, sin configurar nada.
              </p>
              <ul className="mt-3 space-y-1.5 text-sm">
                <li className="flex items-center gap-2">
                  <Badge tone={cron ? "ok" : "warn"}>{cron ? "Listo" : "Falta"}</Badge>
                  <code className="num text-[13px]">CRON_SECRET</code>
                  <span className="text-muted-foreground">protege la ruta del cron</span>
                </li>
                <li className="flex items-center gap-2">
                  <Badge tone={webhook ? "ok" : "warn"}>{webhook ? "Listo" : "Falta"}</Badge>
                  <code className="num text-[13px]">NOTIFY_WEBHOOK_URL</code>
                  <span className="text-muted-foreground">a dónde se envía el resumen</span>
                </li>
              </ul>
              <p className="mt-3 text-[13px] text-muted-foreground">
                {people} {people === 1 ? "persona registrada" : "personas registradas"} en préstamos.
              </p>
            </div>
          </div>
        </Panel>

        <Panel tone="danger" className="lg:col-span-2">
          <div className="flex gap-4 p-5">
            <Icon tone="danger">
              <ShieldAlert />
            </Icon>
            <div className="min-w-0 flex-1">
              <h2 className="text-base text-danger">Borrar datos</h2>
              <p className="mt-1 text-sm text-muted-foreground">No se puede deshacer. Descarga una copia antes.</p>
              <DangerZone />
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
