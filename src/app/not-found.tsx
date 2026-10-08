import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <p className="num text-7xl font-bold text-primary">404</p>
        <h1 className="mt-2 text-xl">Esta página no existe</h1>
        <p className="mt-1 text-muted-foreground">Puede que el componente o el proyecto se haya eliminado.</p>
        <Link href="/" className={buttonVariants({ className: "mt-6" })}>
          Volver al panel
        </Link>
      </div>
    </main>
  );
}
