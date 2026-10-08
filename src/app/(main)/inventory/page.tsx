import Link from "next/link";
import { QrCode } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/panel";
import { getInventory } from "@/lib/queries";
import InventoryClient, { type Filters } from "./InventoryClient";

export const metadata = { title: "Inventario" };

type Search = Promise<{ q?: string; cat?: string; loc?: string; level?: string; new?: string }>;

export default async function InventoryPage({ searchParams }: { searchParams: Search }) {
  const [components, sp] = await Promise.all([getInventory(), searchParams]);
  const initial: Filters = {
    q: sp.q ?? "",
    cat: sp.cat ?? "",
    loc: sp.loc ?? "",
    level: (["attention", "low", "out", "ok"].includes(sp.level ?? "") ? sp.level : "all") as Filters["level"],
  };

  return (
    <>
      <PageHeader title="Inventario" lead="Busca, filtra y ajusta el stock. Toca un componente para ver su ficha completa.">
        <Link href="/labels" className={buttonVariants({ variant: "secondary" })}>
          <QrCode />
          Etiquetas QR
        </Link>
      </PageHeader>
      {/* key: los enlaces del panel (?level=low, ?loc=…) reinician los filtros sin efectos de sincronización */}
      <InventoryClient key={JSON.stringify(sp)} components={components} initial={initial} openNew={sp.new === "1"} />
    </>
  );
}
