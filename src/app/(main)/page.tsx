import { Suspense } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ChevronRight, CircleCheck, Plus, ScanLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Empty, Panel, PanelHeader } from "@/components/ui/panel";
import { PanelSkeleton, Skeleton } from "@/components/ui/skeleton";
import { LevelBar } from "@/components/ui/stock-meter";
import { GenerateWishlistButton, QuickWishlistButton } from "@/components/wishlist-buttons";
import { cop, num } from "@/lib/format";
import { getActivity, getOverview, type Activity, type Overview } from "@/lib/queries";
import { boxColor, MOVEMENT_LABEL } from "@/lib/stock";
import { cn } from "@/lib/utils";
import { CountUp, FlowChart, HealthGauge, LoansChart } from "./DashboardClient";

export const metadata = { title: "Panel" };

// Server Component. Las dos consultas arrancan en paralelo y cada panel se pinta
// en cuanto llega su dato (streaming con Suspense). Al cliente solo viajan el medidor y las gráficas.
export default function DashboardPage() {
  const overview = getOverview();
  const activity = getActivity();

  return (
    <div className="boot grid gap-5 xl:grid-cols-12">
      <Suspense fallback={<HeroSkeleton />}>
        <Hero data={overview} />
      </Suspense>
      <Suspense fallback={<PanelSkeleton className="xl:col-span-8" rows={6} />}>
        <Flow data={activity} />
      </Suspense>
      <Suspense fallback={<PanelSkeleton className="xl:col-span-4" rows={6} />}>
        <Attention data={overview} />
      </Suspense>
      <Suspense fallback={<PanelSkeleton className="xl:col-span-12" rows={2} />}>
        <Bays data={overview} />
      </Suspense>
      <Suspense fallback={<PanelSkeleton className="xl:col-span-4" />}>
        <Categories data={overview} />
      </Suspense>
      <Suspense fallback={<PanelSkeleton className="xl:col-span-4" />}>
        <Loans overview={overview} activity={activity} />
      </Suspense>
      <Suspense fallback={<PanelSkeleton className="xl:col-span-4" />}>
        <Feed data={activity} />
      </Suspense>
    </div>
  );
}

const step = (i: number) => ({ "--i": i }) as React.CSSProperties;

// ── Estado general ───────────────────────────────────────────

async function Hero({ data }: { data: Promise<Overview> }) {
  const o = await data;
  const readouts = [
    { label: "En orden", value: o.levels.ok, tone: "text-ok", href: "/inventory?level=ok" },
    { label: "Bajo mínimo", value: o.levels.low, tone: "text-warn", href: "/inventory?level=low" },
    { label: "Agotados", value: o.levels.out, tone: "text-danger", href: "/inventory?level=out" },
    {
      label: "Prestados",
      value: o.loans.units,
      tone: o.loans.overdue ? "text-danger" : "text-foreground",
      href: "/loans",
      note: o.loans.overdue ? `${o.loans.overdue} ${o.loans.overdue === 1 ? "vencido" : "vencidos"}` : undefined,
    },
    {
      label: "Por comprar",
      value: o.wishlist.pending,
      tone: "text-foreground",
      href: "/wishlist",
      note: o.wishlist.cost ? cop(o.wishlist.cost) : undefined,
    },
  ];

  return (
    <Panel className="xl:col-span-12" style={step(0)}>
      <div className="grid items-center gap-6 p-6 md:grid-cols-[250px_1fr] md:gap-10 md:p-8">
        <HealthGauge value={o.health} ok={o.levels.ok} low={o.levels.low} out={o.levels.out} />

        <div className="min-w-0">
          <h1 className="text-[28px] leading-tight sm:text-4xl">Estado del taller</h1>
          <p className="mt-2 max-w-[60ch] text-muted-foreground">
            {o.total === 0 ? (
              "Todavía no hay componentes. Crea el primero o importa tu Excel desde Ajustes."
            ) : (
              <>
                {num(o.levels.ok)} de {num(o.total)} componentes tienen su mínimo cubierto. Guardas {num(o.units)} unidades
                {o.value > 0 && <> con un valor aproximado de {cop(o.value)}</>}.
              </>
            )}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-5">
            {readouts.map((r) => (
              <Link key={r.label} href={r.href} className="group rounded-[3px] border bg-background/40 px-4 py-3 transition-colors hover:border-primary/50 hover:bg-plate/60">
                <span className="flex items-center justify-between text-[13px] text-muted-foreground">
                  {r.label}
                  <ChevronRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                </span>
                <span className={cn("mt-1 block text-3xl font-semibold leading-none", r.tone)}>
                  <CountUp value={r.value} />
                </span>
                <span className="mt-1 block h-4 text-xs text-muted-foreground">{r.note}</span>
              </Link>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/scan" className={buttonVariants()}>
              <ScanLine />
              Escanear
            </Link>
            <Link href="/inventory?new=1" className={buttonVariants({ variant: "secondary" })}>
              <Plus />
              Nuevo componente
            </Link>
            <GenerateWishlistButton count={o.unordered} />
          </div>
        </div>
      </div>
    </Panel>
  );
}

function HeroSkeleton() {
  return (
    <div className="hud hud-quiet grid items-center gap-10 p-8 md:grid-cols-[250px_1fr] xl:col-span-12">
      <Skeleton className="mx-auto aspect-square w-full max-w-[250px] rounded-full" />
      <div>
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="mt-3 h-4 w-[30rem] max-w-full" />
        <Skeleton className="mt-6 h-24" />
        <Skeleton className="mt-6 h-10 w-80 max-w-full" />
      </div>
    </div>
  );
}

// ── Flujo de stock ───────────────────────────────────────────

async function Flow({ data }: { data: Promise<Activity> }) {
  const a = await data;
  const totalIn = a.flow.reduce((s, d) => s + d.in, 0);
  const totalOut = a.flow.reduce((s, d) => s + d.out, 0);

  return (
    <Panel className="flex flex-col xl:col-span-8" style={step(1)}>
      <PanelHeader
        title="Flujo de stock"
        hint="Unidades que entraron y salieron cada día, últimos 30 días"
        action={
          a.hasFlow && (
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1.5">
                <span className="size-2 bg-primary" />
                <span className="num font-semibold">+{num(totalIn)}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 bg-accent" />
                <span className="num font-semibold">−{num(totalOut)}</span>
              </span>
            </div>
          )
        }
      />
      {a.hasFlow ? (
        <div className="relative min-h-[300px] flex-1">
          <div className="absolute inset-0 px-3 pb-4">
            <FlowChart data={a.flow} />
          </div>
        </div>
      ) : (
        <Empty title="Aún no hay movimientos este mes">
          Cada entrada, salida, préstamo o lectura del escáner queda registrada y aparece aquí.
        </Empty>
      )}
    </Panel>
  );
}

// ── Cola de acción ───────────────────────────────────────────

const DOT = { ok: "bg-ok", low: "bg-warn", out: "bg-danger" } as const;

async function Attention({ data }: { data: Promise<Overview> }) {
  const o = await data;
  return (
    <Panel className="flex flex-col xl:col-span-4" tone={o.attention.some((a) => a.level === "out") ? "danger" : "default"} style={step(2)}>
      <PanelHeader title="Requiere acción" hint={o.attentionTotal ? `${o.attentionTotal} pendientes, lo más urgente primero` : undefined} />
      {o.attention.length === 0 ? (
        <Empty title="Nada pendiente" icon={<CircleCheck className="text-ok" />}>
          Todo el stock está sobre su mínimo y no hay préstamos vencidos.
        </Empty>
      ) : (
        <ul className="flex-1 divide-y">
          {o.attention.map((item) => (
            <li key={`${item.kind}-${item.id}`} className="flex items-center gap-3 px-5 py-2.5">
              <span className={cn("size-2 shrink-0", DOT[item.level], item.kind === "loan" && "animate-alarm")} />
              <Link href={item.kind === "loan" ? "/loans" : `/inventory/${item.componentId}`} className="min-w-0 flex-1 hover:text-primary">
                <span className="block truncate text-sm font-medium">{item.title}</span>
                <span className="block truncate text-[13px] text-muted-foreground">{item.detail}</span>
              </Link>
              {item.kind === "stock" ? (
                <QuickWishlistButton componentId={item.componentId} ordered={item.ordered} />
              ) : (
                <Badge tone="danger">Vencido</Badge>
              )}
            </li>
          ))}
        </ul>
      )}
      {o.attentionTotal > o.attention.length && (
        <Link href="/inventory?level=attention" className="border-t px-5 py-3 text-sm font-medium text-primary hover:bg-plate">
          Ver los {o.attentionTotal}
        </Link>
      )}
    </Panel>
  );
}

// ── Cajas físicas ────────────────────────────────────────────

async function Bays({ data }: { data: Promise<Overview> }) {
  const o = await data;
  if (o.bays.length === 0) return null;
  return (
    <Panel className="xl:col-span-12" style={step(3)}>
      <PanelHeader title="Cajas" hint="Dónde está guardado cada componente y cómo va cada caja" />
      <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {o.bays.map((b) => (
          <Link
            key={b.name}
            href={b.name === "Sin ubicar" ? "/inventory?loc=__none" : `/inventory?loc=${encodeURIComponent(b.name)}`}
            className="group flex gap-4 rounded-[3px] border bg-background/40 px-4 py-3.5 transition-colors hover:border-primary/50 hover:bg-plate/60"
          >
            {/* El color sale del nombre: "Caja Verde" se pinta verde, igual que la caja real */}
            <span className="cut-sm mt-0.5 size-9 shrink-0" style={{ background: boxColor(b.name) }} />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate font-display font-semibold group-hover:text-primary">{b.name}</span>
                <span className="num text-sm text-muted-foreground">{num(b.units)} uds</span>
              </span>
              <LevelBar ok={b.ok} low={b.low} out={b.out} className="mt-2" />
              <span className="mt-1.5 block text-[13px] text-muted-foreground">
                {b.total} {b.total === 1 ? "componente" : "componentes"}
                {b.low + b.out > 0 && <>, {b.low + b.out} por reponer</>}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </Panel>
  );
}

// ── Categorías ───────────────────────────────────────────────

async function Categories({ data }: { data: Promise<Overview> }) {
  const o = await data;
  const top = o.categories.slice(0, 7);
  const max = Math.max(...top.map((c) => c.units), 1);
  return (
    <Panel className="xl:col-span-4" style={step(4)}>
      <PanelHeader title="Categorías" hint="Unidades guardadas por tipo" />
      {top.length === 0 ? (
        <Empty title="Sin categorías todavía" />
      ) : (
        <ul className="space-y-3 px-5 pb-5">
          {top.map((c) => (
            <li key={c.name}>
              <Link href={`/inventory?cat=${encodeURIComponent(c.name)}`} className="group block">
                <span className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate group-hover:text-primary">{c.name}</span>
                  <span className="num shrink-0 text-muted-foreground">
                    {num(c.units)}
                    {c.attention > 0 && <span className="ml-2 text-warn">{c.attention} bajos</span>}
                  </span>
                </span>
                <span className="mt-1 block h-1.5 bg-plate">
                  <span className="block h-full bg-primary/80" style={{ width: `${Math.max((c.units / max) * 100, 2)}%` }} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// ── Préstamos ────────────────────────────────────────────────

async function Loans({ overview, activity }: { overview: Promise<Overview>; activity: Promise<Activity> }) {
  const [o, a] = await Promise.all([overview, activity]);
  return (
    <Panel className="flex flex-col xl:col-span-4" style={step(5)}>
      <PanelHeader
        title="Préstamos"
        hint="Unidades prestadas y devueltas por semana"
        action={<Badge tone={o.loans.overdue ? "danger" : "neutral"}>{o.loans.active} activos</Badge>}
      />
      {a.hasLoans ? (
        <div className="relative min-h-[220px] flex-1">
          <div className="absolute inset-0 px-3 pb-4">
            <LoansChart data={a.weekly} />
          </div>
        </div>
      ) : (
        <Empty title="Nadie tiene material prestado">
          Cuando prestes algo, aquí verás cuánto sale y cuánto vuelve cada semana.
        </Empty>
      )}
    </Panel>
  );
}

// ── Actividad reciente ───────────────────────────────────────

async function Feed({ data }: { data: Promise<Activity> }) {
  const a = await data;
  return (
    <Panel className="flex flex-col xl:col-span-4" style={step(6)}>
      <PanelHeader
        title="Últimos movimientos"
        action={
          <Link href="/movements" className="text-sm font-medium text-primary hover:underline">
            Ver todos
          </Link>
        }
      />
      {a.recent.length === 0 ? (
        <Empty title="Sin movimientos todavía" />
      ) : (
        <ul className="divide-y">
          {a.recent.map((m) => (
            <li key={m.id}>
              <Link href={`/inventory/${m.componentId}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-plate">
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-sm", m.delta > 0 ? "bg-ok/12 text-ok" : "bg-accent/12 text-accent")}>
                  {m.delta > 0 ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{m.name}</span>
                  <span className="block truncate text-[13px] text-muted-foreground">
                    {MOVEMENT_LABEL[m.type] ?? m.type}
                    {m.notes && `: ${m.notes}`}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className={cn("num block text-sm font-semibold", m.delta > 0 ? "text-ok" : "text-foreground")}>
                    {m.delta > 0 ? "+" : "−"}
                    {Math.abs(m.delta)}
                  </span>
                  <span className="block text-xs text-muted-foreground">{m.when}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
