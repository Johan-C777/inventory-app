import "server-only";
import { cache } from "react";
import prisma, { ci } from "./prisma";
import { dateOnlyKey, dayKey, daysBetween, fromNow } from "./format";
import { loanState, signedDelta, stockLevel, type StockLevel } from "./stock";

// Lecturas: solo se llaman desde Server Components. Nada de "use server" + useEffect.

const DAY = 86_400_000;

/** Base compartida por layout y páginas; cache() la deduplica dentro de un mismo render. */
export const getComponentIndex = cache(() =>
  prisma.component.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      value: true,
      part_number: true,
      category: true,
      location: true,
      unit: true,
      current_quantity: true,
      min_stock: true,
      approximate_cost: true,
    },
  }),
);
export type ComponentLite = Awaited<ReturnType<typeof getComponentIndex>>[number];

export const getActiveLoans = cache(() =>
  prisma.loan.findMany({
    where: { status: "PRESTADO" },
    orderBy: { expected_return_date: { sort: "asc", nulls: "last" } },
    include: { component: { select: { id: true, name: true, unit: true } } },
  }),
);

/** Alertas derivadas del estado real: no hay tabla de notificaciones que pueda quedar desfasada. */
export async function getAlerts() {
  const [components, loans, pendingWishlist] = await Promise.all([
    getComponentIndex(),
    getActiveLoans(),
    prisma.wishlistItem.findMany({ where: { status: "PENDIENTE", component_id: { not: null } }, select: { component_id: true } }),
  ]);
  const today = dayKey(new Date());
  const ordered = new Set(pendingWishlist.map((w) => w.component_id));

  const loanAlerts = loans
    .map((l) => ({ loan: l, ...loanState(l, today) }))
    .filter((l) => l.state === "overdue" || l.state === "dueSoon")
    .map(({ loan, state, days }) => ({
      id: `loan-${loan.id}`,
      tone: state === "overdue" ? ("danger" as const) : ("warn" as const),
      title: `${loan.person} · ${loan.quantity} ${loan.component.unit} de ${loan.component.name}`,
      detail:
        state === "overdue"
          ? `Vencido hace ${days} ${days === 1 ? "día" : "días"}`
          : days === 0
            ? "Vence hoy"
            : `Vence en ${days} ${days === 1 ? "día" : "días"}`,
      href: "/loans",
    }));

  const out = components.filter((c) => stockLevel(c.current_quantity, c.min_stock) === "out");
  const low = components.filter((c) => stockLevel(c.current_quantity, c.min_stock) === "low");
  const unordered = [...out, ...low].filter((c) => !ordered.has(c.id)).length;

  const stockAlerts = [
    out.length && {
      id: "out",
      tone: "danger" as const,
      title: `${out.length} ${out.length === 1 ? "componente agotado" : "componentes agotados"}`,
      detail: out.slice(0, 3).map((c) => c.name).join(", ") + (out.length > 3 ? "…" : ""),
      href: "/inventory?level=out",
    },
    low.length && {
      id: "low",
      tone: "warn" as const,
      title: `${low.length} bajo el mínimo`,
      detail: unordered ? `${unordered} sin pedido en la wishlist` : "Todos tienen pedido en la wishlist",
      href: "/inventory?level=low",
    },
  ].filter((a) => !!a);

  return [...loanAlerts, ...stockAlerts];
}
export type Alert = Awaited<ReturnType<typeof getAlerts>>[number];

// ── Dashboard ────────────────────────────────────────────────

export async function getOverview() {
  const [components, loans, wishlist] = await Promise.all([
    getComponentIndex(),
    getActiveLoans(),
    prisma.wishlistItem.findMany({ where: { status: "PENDIENTE" } }),
  ]);
  const today = dayKey(new Date());
  const levels: Record<StockLevel, number> = { ok: 0, low: 0, out: 0 };
  const bays = new Map<string, { name: string; total: number; ok: number; low: number; out: number; units: number }>();
  const cats = new Map<string, { name: string; count: number; units: number; attention: number }>();
  let units = 0;
  let value = 0;

  for (const c of components) {
    const level = stockLevel(c.current_quantity, c.min_stock);
    levels[level]++;
    units += c.current_quantity;
    value += (c.approximate_cost ?? 0) * c.current_quantity;

    const bayName = c.location?.trim() || "Sin ubicar";
    const bay = bays.get(bayName) ?? { name: bayName, total: 0, ok: 0, low: 0, out: 0, units: 0 };
    bay.total++;
    bay[level]++;
    bay.units += c.current_quantity;
    bays.set(bayName, bay);

    const cat = cats.get(c.category) ?? { name: c.category, count: 0, units: 0, attention: 0 };
    cat.count++;
    cat.units += c.current_quantity;
    if (level !== "ok") cat.attention++;
    cats.set(c.category, cat);
  }

  const ordered = new Set(wishlist.map((w) => w.component_id).filter(Boolean));
  const loanStates = loans.map((l) => ({ ...l, ...loanState(l, today) }));
  const overdue = loanStates.filter((l) => l.state === "overdue");

  // Cola de acción: lo vencido primero, luego agotados, luego lo más lejos de su mínimo
  const attention = [
    ...overdue.map((l) => ({
      kind: "loan" as const,
      id: l.id,
      title: l.component.name,
      detail: `${l.person} · ${l.quantity} ${l.component.unit} · vencido hace ${l.days} ${l.days === 1 ? "día" : "días"}`,
      level: "out" as StockLevel,
      ordered: false,
      componentId: l.component.id,
    })),
    ...components
      .filter((c) => stockLevel(c.current_quantity, c.min_stock) !== "ok")
      .sort((a, b) => a.current_quantity / Math.max(a.min_stock, 1) - b.current_quantity / Math.max(b.min_stock, 1))
      .map((c) => ({
        kind: "stock" as const,
        id: c.id,
        title: c.value ? `${c.name} · ${c.value}` : c.name,
        detail: `${c.current_quantity} de ${c.min_stock} ${c.unit}${c.location ? ` · ${c.location}` : ""}`,
        level: stockLevel(c.current_quantity, c.min_stock),
        ordered: ordered.has(c.id),
        componentId: c.id,
      })),
  ];

  const total = components.length;
  return {
    total,
    units,
    value,
    levels,
    health: total ? Math.round((levels.ok / total) * 100) : 100,
    bays: [...bays.values()].sort((a, b) => b.total - a.total),
    categories: [...cats.values()].sort((a, b) => b.units - a.units),
    attention: attention.slice(0, 7),
    attentionTotal: attention.length,
    unordered: components.filter((c) => stockLevel(c.current_quantity, c.min_stock) !== "ok" && !ordered.has(c.id)).length,
    loans: { active: loans.length, overdue: overdue.length, units: loans.reduce((s, l) => s + l.quantity, 0) },
    wishlist: {
      pending: wishlist.length,
      cost: wishlist.reduce((s, w) => s + (w.estimated_price ?? 0) * w.quantity, 0),
    },
  };
}
export type Overview = Awaited<ReturnType<typeof getOverview>>;

export async function getActivity(days = 30) {
  const now = new Date();
  const since = new Date(now.getTime() - days * DAY);
  const weeksBack = 8;
  const [components, movements, recent, loans] = await Promise.all([
    getComponentIndex(),
    prisma.movement.findMany({ where: { date: { gte: since } }, select: { type: true, quantity: true, date: true } }),
    prisma.movement.findMany({
      take: 7,
      orderBy: { date: "desc" },
      include: { component: { select: { id: true, name: true, unit: true } } },
    }),
    prisma.loan.findMany({
      where: { OR: [{ loan_date: { gte: new Date(now.getTime() - weeksBack * 7 * DAY) } }, { status: "PRESTADO" }] },
      select: { loan_date: true, actual_return_date: true, status: true, quantity: true },
    }),
  ]);

  // Flujo diario + stock total reconstruido hacia atrás desde el valor actual
  const byDay = new Map<string, { in: number; out: number }>();
  for (const m of movements) {
    const d = signedDelta(m.type, m.quantity);
    const k = dayKey(m.date);
    const row = byDay.get(k) ?? { in: 0, out: 0 };
    if (d > 0) row.in += d;
    else row.out += -d;
    byDay.set(k, row);
  }
  let running = components.reduce((s, c) => s + c.current_quantity, 0);
  const flow: { day: string; in: number; out: number; total: number }[] = [];
  for (let i = 0; i < days; i++) {
    const k = dayKey(new Date(now.getTime() - i * DAY));
    const row = byDay.get(k) ?? { in: 0, out: 0 };
    flow.unshift({ day: k, in: row.in, out: row.out, total: running });
    running -= row.in - row.out;
  }

  // Préstamos por semana: los que salieron y los que volvieron
  const today = dayKey(now);
  const weekly = Array.from({ length: weeksBack }, (_, i) => ({ week: weeksBack - 1 - i, lent: 0, returned: 0 }));
  const weekOf = (d: Date) => Math.floor(daysBetween(dayKey(d), today) / 7);
  for (const l of loans) {
    const w = weekly.find((x) => x.week === weekOf(l.loan_date));
    if (w) w.lent += l.quantity;
    if (l.actual_return_date && l.status === "DEVUELTO") {
      const r = weekly.find((x) => x.week === weekOf(l.actual_return_date!));
      if (r) r.returned += l.quantity;
    }
  }

  return {
    flow,
    hasFlow: movements.length > 0,
    weekly: weekly.map((w) => ({ ...w, label: w.week === 0 ? "Esta" : `-${w.week}` })),
    hasLoans: loans.length > 0,
    recent: recent.map((m) => ({
      id: m.id,
      componentId: m.component.id,
      name: m.component.name,
      unit: m.component.unit,
      type: m.type,
      delta: signedDelta(m.type, m.quantity),
      notes: m.notes,
      when: fromNow(m.date, now),
    })),
  };
}
export type Activity = Awaited<ReturnType<typeof getActivity>>;

// ── Inventario ───────────────────────────────────────────────

export const getInventory = () =>
  prisma.component.findMany({
    orderBy: { name: "asc" },
    include: {
      projects: { select: { quantity: true } },
      loans: { where: { status: "PRESTADO" }, select: { quantity: true } },
      wishlist: { where: { status: "PENDIENTE" }, select: { id: true } },
    },
  });
export type InventoryRow = Awaited<ReturnType<typeof getInventory>>[number];

export const getComponent = (id: string) =>
  prisma.component.findUnique({
    where: { id },
    include: {
      movements: { orderBy: { date: "desc" }, take: 60 },
      loans: { orderBy: { loan_date: "desc" }, take: 20 },
      projects: { include: { project: { select: { id: true, name: true, kind: true } } } },
      boards: { include: { board: true } },
      wishlist: { where: { status: "PENDIENTE" }, select: { id: true, quantity: true } },
    },
  });
export type ComponentDetail = NonNullable<Awaited<ReturnType<typeof getComponent>>>;

export const getBoards = cache(() => prisma.board.findMany({ orderBy: [{ family: "asc" }, { name: "asc" }] }));

// ── Movimientos (filtrado en servidor vía searchParams) ───────

export async function getMovements(filter: { q?: string; type?: string }) {
  const q = filter.q?.trim();
  return prisma.movement.findMany({
    where: {
      ...(filter.type && filter.type !== "ALL" && { type: filter.type }),
      ...(q && {
        OR: [
          { notes: { contains: q, ...ci } },
          { component: { name: { contains: q, ...ci } } },
          { component: { part_number: { contains: q, ...ci } } },
        ],
      }),
    },
    orderBy: { date: "desc" },
    take: 250,
    include: { component: { select: { id: true, name: true, part_number: true, unit: true } } },
  });
}

// ── Préstamos ────────────────────────────────────────────────

export async function getLoansPage() {
  const [loans, people] = await Promise.all([
    prisma.loan.findMany({
      orderBy: [{ status: "desc" }, { loan_date: "desc" }],
      take: 300,
      include: { component: { select: { id: true, name: true, part_number: true, unit: true } } },
    }),
    prisma.person.findMany({ orderBy: { name: "asc" }, include: { loans: { select: { status: true, quantity: true } } } }),
  ]);
  const today = dayKey(new Date());
  return {
    loans: loans.map((l) => ({
      ...l,
      ...loanState(l, today),
      dueKey: l.expected_return_date ? dateOnlyKey(l.expected_return_date) : null,
    })),
    people: people.map((p) => ({
      id: p.id,
      name: p.name,
      contact: p.contact,
      active: p.loans.filter((l) => l.status === "PRESTADO").reduce((s, l) => s + l.quantity, 0),
      total: p.loans.length,
      lost: p.loans.filter((l) => l.status === "PERDIDO").length,
    })),
  };
}
export type LoansPage = Awaited<ReturnType<typeof getLoansPage>>;

// ── Wishlist ─────────────────────────────────────────────────

export const getWishlist = () =>
  prisma.wishlistItem.findMany({
    orderBy: { created_at: "desc" },
    include: { component: { select: { id: true, name: true, current_quantity: true, min_stock: true, unit: true } } },
  });
export type WishlistRow = Awaited<ReturnType<typeof getWishlist>>[number];

// ── Proyectos ────────────────────────────────────────────────

const projectInclude = {
  board: true,
  prints: { orderBy: [{ name: "asc" as const }, { iteration: "desc" as const }] },
  components: {
    include: {
      component: {
        select: { id: true, name: true, value: true, part_number: true, unit: true, current_quantity: true, category: true },
      },
    },
  },
};

export const getProjects = () => prisma.project.findMany({ orderBy: { created_at: "desc" }, include: projectInclude });
export const getProject = (id: string) => prisma.project.findUnique({ where: { id }, include: projectInclude });
export type ProjectFull = Awaited<ReturnType<typeof getProjects>>[number];

/** Cuántas líneas del BOM no se pueden cubrir con el stock actual. */
export const bomShortage = (p: ProjectFull) =>
  p.components.filter((pc) => pc.component.current_quantity < pc.quantity).length;
