import { Suspense } from "react";
import Link from "next/link";
import { ScanLine } from "lucide-react";
import { AlertsBell } from "@/components/shell/AlertsBell";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { MobileNav } from "@/components/shell/MobileNav";
import { Logo, Sidebar } from "@/components/shell/Sidebar";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { getAlerts, getComponentIndex } from "@/lib/queries";

// Server Component: el marco sale de inmediato y los datos de la barra llegan por streaming.
async function TopbarData() {
  const [index, alerts] = await Promise.all([getComponentIndex(), getAlerts()]);
  return (
    <>
      <CommandPalette index={index} />
      <div className="ml-auto flex items-center gap-1">
        <Link href="/scan" className={cn(buttonVariants(), "hidden sm:inline-flex")}>
          <ScanLine />
          Escanear
        </Link>
        <AlertsBell alerts={alerts} />
      </div>
    </>
  );
}

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  await requireSession(); // segunda barrera además de proxy.ts

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-hull/70 px-4 backdrop-blur-xl sm:px-8">
          <Link href="/" className="lg:hidden" aria-label="Inventario Pro">
            <Logo className="size-7" />
          </Link>
          <Suspense
            fallback={
              <>
                <Skeleton className="h-10 w-full max-w-md" />
                <Skeleton className="ml-auto size-10" />
              </>
            }
          >
            <TopbarData />
          </Suspense>
        </header>
        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 pb-28 pt-6 sm:px-8 lg:pb-12">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
