import Link from "next/link";
import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Empty, PageHeader, Panel } from "@/components/ui/panel";
import { fmtDateYear, fmtTime } from "@/lib/format";
import { getMovements } from "@/lib/queries";
import { MOVEMENT_LABEL, signedDelta } from "@/lib/stock";
import { cn } from "@/lib/utils";
import { MovementFilters } from "./MovementFilters";

export const metadata = { title: "Movimientos" };

const SOURCE: Record<string, string> = { SCAN: "Escáner", LOAN: "Préstamo", WISHLIST: "Wishlist", PROJECT: "Proyecto" };

// El filtro vive en la URL y la consulta corre en Postgres: la tabla entera es Server Component.
export default async function MovementsPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const sp = await searchParams;
  const movements = await getMovements(sp);

  return (
    <>
      <PageHeader title="Movimientos" lead="Cada cambio de stock queda aquí: compras, usos, préstamos, lecturas del escáner y ajustes." />
      <Panel>
        <MovementFilters q={sp.q ?? ""} type={sp.type ?? "ALL"} />
        {movements.length === 0 ? (
          <Empty title={sp.q || (sp.type && sp.type !== "ALL") ? "Ningún movimiento coincide" : "Aún no hay movimientos"} icon={<ArrowRightLeft />}>
            {!sp.q && "Suma o descuenta stock desde el inventario o el escáner y quedará registrado."}
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-[13px] text-muted-foreground [&>th]:px-4 [&>th]:py-3 [&>th]:font-medium">
                  <th>Fecha</th>
                  <th>Componente</th>
                  <th>Tipo</th>
                  <th className="text-right">Cantidad</th>
                  <th>Nota</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => {
                  const delta = signedDelta(m.type, m.quantity);
                  return (
                    <tr key={m.id} className="border-t hover:bg-plate/70 [&>td]:px-4 [&>td]:py-2.5">
                      <td className="whitespace-nowrap">
                        {fmtDateYear(m.date)} <span className="num text-xs text-muted-foreground">{fmtTime(m.date)}</span>
                      </td>
                      <td>
                        <Link href={`/inventory/${m.component.id}`} className="font-medium hover:text-primary">
                          {m.component.name}
                        </Link>
                        {m.component.part_number && <span className="num ml-2 text-xs text-muted-foreground">{m.component.part_number}</span>}
                      </td>
                      <td>
                        <span className="flex items-center gap-2">
                          <span className={cn("grid size-6 place-items-center rounded-sm", delta > 0 ? "bg-ok/12 text-ok" : "bg-accent/12 text-accent")}>
                            {delta > 0 ? <ArrowDownLeft className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}
                          </span>
                          {MOVEMENT_LABEL[m.type] ?? m.type}
                          {SOURCE[m.source] && m.type !== "PRESTAMO" && <Badge>{SOURCE[m.source]}</Badge>}
                        </span>
                      </td>
                      <td className={cn("num text-right font-semibold", delta > 0 && "text-ok")}>
                        {delta > 0 ? "+" : "−"}
                        {Math.abs(delta)} <span className="text-xs font-normal text-muted-foreground">{m.component.unit}</span>
                      </td>
                      <td className="max-w-xs truncate text-muted-foreground">{m.notes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {movements.length === 250 && <p className="border-t px-4 py-3 text-[13px] text-muted-foreground">Se muestran los 250 más recientes. Filtra para ver más atrás.</p>}
      </Panel>
    </>
  );
}
