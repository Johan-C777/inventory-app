import { PageHeader } from "@/components/ui/panel";
import { dayKey } from "@/lib/format";
import { getComponentIndex, getLoansPage } from "@/lib/queries";
import LoansClient from "./LoansClient";

export const metadata = { title: "Préstamos" };

export default async function LoansPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const [{ loans, people }, index, sp] = await Promise.all([getLoansPage(), getComponentIndex(), searchParams]);
  const components = index
    .filter((c) => c.current_quantity > 0)
    .map(({ id, name, value, unit, current_quantity }) => ({ id, name, value, unit, current_quantity }));

  return (
    <>
      <PageHeader title="Préstamos" lead="Quién tiene qué y cuándo vuelve. Los vencidos suben solos al principio y a las alertas." />
      <LoansClient loans={loans} people={people} components={components} today={dayKey(new Date())} openNew={sp.new === "1"} />
    </>
  );
}
