import { ArrowRightLeft, Bookmark, Boxes, FolderKanban, Handshake, LayoutDashboard, ScanLine, Settings, type LucideIcon } from "lucide-react";

export type NavItem = { name: string; href: string; icon: LucideIcon };

export const NAV: NavItem[] = [
  { name: "Panel", href: "/", icon: LayoutDashboard },
  { name: "Inventario", href: "/inventory", icon: Boxes },
  { name: "Escanear", href: "/scan", icon: ScanLine },
  { name: "Movimientos", href: "/movements", icon: ArrowRightLeft },
  { name: "Préstamos", href: "/loans", icon: Handshake },
  { name: "Wishlist", href: "/wishlist", icon: Bookmark },
  { name: "Proyectos", href: "/projects", icon: FolderKanban },
];

export const SETTINGS: NavItem = { name: "Ajustes", href: "/settings", icon: Settings };

export const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
