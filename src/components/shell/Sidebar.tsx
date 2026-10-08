"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { LogOut } from "lucide-react";
import { logout } from "@/actions/auth";
import { cn } from "@/lib/utils";
import { NAV, SETTINGS, isActive, type NavItem } from "./nav";

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M9 2h21v21l-7 7H2V9z" fill="none" stroke="var(--ion)" strokeWidth="1.6" />
      <path d="M12 12h8v8h-8z" fill="var(--thruster)" />
      <path d="M16 2v6M16 24v6M2 16h6M24 16h6" stroke="var(--ion)" strokeWidth="1.6" />
    </svg>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-10 items-center gap-3 px-3 text-sm font-medium transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {active && (
        // layoutId: el resaltado se desliza entre secciones en vez de saltar
        <motion.span
          layoutId="nav-active"
          className="cut-sm absolute inset-0 border-l-2 border-primary bg-primary/10"
          transition={{ type: "spring", stiffness: 500, damping: 38 }}
        />
      )}
      <item.icon className={cn("relative size-[18px]", active && "text-primary")} />
      <span className="relative">{item.name}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="no-print sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-hull/70 backdrop-blur-xl lg:flex">
      <Link href="/" className="flex h-16 items-center gap-3 border-b px-5">
        <Logo className="size-7" />
        <span className="font-display text-lg font-semibold tracking-wide">Inventario Pro</span>
      </Link>

      <nav aria-label="Secciones" className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
      </nav>

      <div className="space-y-1 border-t p-3">
        <NavLink item={SETTINGS} active={isActive(pathname, SETTINGS.href)} />
        <form action={logout}>
          <button className="flex h-10 w-full items-center gap-3 px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-danger">
            <LogOut className="size-[18px]" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
