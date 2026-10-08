"use client";

import { Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtDateOnly } from "@/lib/format";
import type { Activity } from "@/lib/queries";

const AXIS = { fontSize: 11, fill: "var(--dim)", fontFamily: "var(--font-display)" };
const GRID = "color-mix(in oklab, var(--line) 80%, transparent)";

type TipRow = { name?: string | number; value?: number | string | readonly (number | string)[]; color?: string };

function Tip({ active, payload, label }: { active?: boolean; payload?: readonly TipRow[]; label?: string | number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[3px] border border-input bg-popover/95 px-3 py-2 text-xs shadow-xl shadow-black/50 backdrop-blur">
      <p className="mb-1 font-display font-semibold">{label}</p>
      {payload.map((p) => (
        <p key={String(p.name)} className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="size-2" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="num font-semibold">{String(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

export function FlowChart({ data }: { data: Activity["flow"] }) {
  const rows = data.map((d) => ({ ...d, label: fmtDateOnly(new Date(d.day)) }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={rows} margin={{ top: 8, right: 0, left: -18, bottom: 0 }} barGap={1}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: "var(--line)" }} interval="preserveStartEnd" minTickGap={36} />
        <YAxis yAxisId="flow" tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis yAxisId="total" orientation="right" tick={AXIS} tickLine={false} axisLine={false} domain={["dataMin - 5", "dataMax + 5"]} allowDecimals={false} width={44} />
        <Tooltip content={Tip} cursor={{ fill: "color-mix(in oklab, var(--ion) 7%, transparent)" }} />
        <Bar yAxisId="flow" dataKey="in" name="Entradas" fill="var(--ion)" maxBarSize={9} animationDuration={700} />
        <Bar yAxisId="flow" dataKey="out" name="Salidas" fill="var(--thruster)" maxBarSize={9} animationDuration={700} />
        <Line yAxisId="total" dataKey="total" name="Unidades en stock" type="stepAfter" stroke="var(--silk)" strokeWidth={1.5} dot={false} animationDuration={900} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function LoansChart({ data }: { data: Activity["weekly"] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }} barGap={2}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: "var(--line)" }} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip content={Tip} cursor={{ fill: "color-mix(in oklab, var(--ion) 7%, transparent)" }} labelFormatter={(l) => (l === "Esta" ? "Esta semana" : `Hace ${String(l).slice(1)} sem.`)} />
        <Bar dataKey="lent" name="Prestadas" fill="var(--thruster)" maxBarSize={14} animationDuration={700} />
        <Bar dataKey="returned" name="Devueltas" fill="var(--ok)" maxBarSize={14} animationDuration={700} />
      </BarChart>
    </ResponsiveContainer>
  );
}
