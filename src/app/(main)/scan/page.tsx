import { PageHeader } from "@/components/ui/panel";
import { getComponentIndex } from "@/lib/queries";
import Scanner from "./Scanner";

export const metadata = { title: "Escanear" };

export default async function ScanPage() {
  const index = await getComponentIndex();
  return (
    <>
      <PageHeader
        title="Escanear"
        lead="Apunta al QR de la etiqueta o al código de barras de la bolsa. También funciona con un lector USB: escribe en el campo y pulsa Enter."
      />
      <Scanner index={index.map(({ id, name, value, part_number }) => ({ id, name, value, part_number }))} />
    </>
  );
}
