"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Popover } from "radix-ui";
import { LogOut, Menu } from "lucide-react";
import { logout } from "@/actions/auth";
import { cn } from "@/lib/utils";
import { NAV, SETTINGS, isActive } from "./nav";

const TABS = ["/", "/inventory", "/scan", "/loans"];

/** En el banco de trabajo la app se usa con el teléfono: barra inferior con el escáner al centro. */
export function MobileNav() {
  const pathname = usePathname();
  const tabs = NAV.filter((n) => TABS.includes(n.href));
  const rest = [...NAV.filter((n) => !TABS.includes(n.href)), SETTINGS];
  const restActive = rest.some((n) => isActive(pathname, n.href));

  return (
    <nav
      aria-label="Secciones"
      className="no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-hull/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      {tabs.map((item) => {
        const active = isActive(pathname, item.href);
        const scan = item.href === "/scan";
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <span className={cn(scan && "cut-sm -mt-5 grid size-12 place-items-center bg-primary text-primary-foreground")}>
              <item.icon className={scan ? "size-6" : "size-5"} />
            </span>
            {item.name}
          </Link>
        );
      })}
      <Popover.Root>
        <Popover.Trigger
          className={cn(
            "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium",
            restActive ? "text-primary" : "text-muted-foreground",
          )}
        >
          <Menu className="size-5" />
          Más
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content side="top" align="end" sideOffset={8} className="z-50 mr-2 w-56 rounded-md border border-input bg-popover p-1.5 shadow-2xl shadow-black/60">
            {rest.map((item) => (
              <Popover.Close asChild key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-sm px-3 text-sm font-medium",
                    isActive(pathname, item.href) ? "bg-primary/10 text-primary" : "text-foreground",
                  )}
                >
                  <item.icon className="size-[18px]" />
                  {item.name}
                </Link>
              </Popover.Close>
            ))}
            <form action={logout} className="mt-1 border-t pt-1">
              <button className="flex h-11 w-full items-center gap-3 rounded-sm px-3 text-sm font-medium text-danger">
                <LogOut className="size-[18px]" />
                Cerrar sesión
              </button>
            </form>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </nav>
  );
}
