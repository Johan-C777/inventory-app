import Link from "next/link";
import QRCode from "qrcode";
import { Empty, PageHeader } from "@/components/ui/panel";
import { appOrigin } from "@/lib/origin";
import { getComponentIndex } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { PrintButton } from "./PrintButton";

export const metadata = { title: "Etiquetas QR" };

// Los QR se generan en el servidor como SVG: cero JavaScript en el cliente y nitidez perfecta al imprimir.
export default async function LabelsPage({ searchParams }: { searchParams: Promise<{ loc?: string; ids?: string }> }) {
  const [{ loc, ids }, all, origin] = await Promise.all([searchParams, getComponentIndex(), appOrigin()]);
  const wanted = ids?.split(",");
  const locations = [...new Set(all.map((c) => c.location).filter((l): l is string => !!l))].sort();
  const components = all.filter((c) => (wanted ? wanted.includes(c.id) : loc ? c.location === loc : true));

  const labels = await Promise.all(
    components.map(async (c) => ({
      ...c,
      qr: await QRCode.toString(`${origin}/inventory/${c.id}`, { type: "svg", margin: 0, errorCorrectionLevel: "M" }),
    })),
  );

  const chip = (active: boolean) =>
    cn("rounded-sm border px-3 py-1.5 text-sm font-medium transition-colors", active ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground hover:text-foreground");

  return (
    <>
      <div className="no-print">
        <PageHeader title="Etiquetas QR" lead="Imprime, recorta y pega en cada bolsa o gaveta. Cada código abre la ficha del componente y sirve para el escáner.">
          <PrintButton />
        </PageHeader>
        <div className="mb-6 flex flex-wrap gap-2">
          <Link href="/labels" className={chip(!loc && !wanted)}>
            Todo ({all.length})
          </Link>
          {locations.map((l) => (
            <Link key={l} href={`/labels?loc=${encodeURIComponent(l)}`} className={chip(loc === l)}>
              {l}
            </Link>
          ))}
        </div>
      </div>

      {labels.length === 0 ? (
        <Empty title="No hay componentes para etiquetar" />
      ) : (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4 print:grid-cols-3 print:gap-0">
          {labels.map((c) => (
            <div key={c.id} className="flex break-inside-avoid items-center gap-3 border border-dashed border-neutral-400 bg-white p-2.5 text-black">
              <div className="size-[72px] shrink-0 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: c.qr }} />
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[13px] font-bold">{c.name}</p>
                {c.value && <p className="truncate text-[11px]">{c.value}</p>}
                {c.part_number && <p className="truncate font-mono text-[11px] font-semibold">{c.part_number}</p>}
                {c.location && <p className="mt-0.5 truncate text-[10px] text-neutral-600">{c.location}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
