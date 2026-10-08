"use client";

// Islas de cliente del panel. Todo lo demás se renderiza en el servidor (page.tsx).
import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { animate, motion, useReducedMotion } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";
import { cop, num } from "@/lib/format";
import type { Activity } from "@/lib/queries";

// Recharts (~100 kB) solo se descarga en el cliente y después del primer pintado.
const ChartSkeleton = () => <Skeleton className="size-full" />;
const FlowChartImpl = dynamic(() => import("./charts").then((m) => m.FlowChart), { ssr: false, loading: ChartSkeleton });
const LoansChartImpl = dynamic(() => import("./charts").then((m) => m.LoansChart), { ssr: false, loading: ChartSkeleton });

export const FlowChart = ({ data }: { data: Activity["flow"] }) => <FlowChartImpl data={data} />;
export const LoansChart = ({ data }: { data: Activity["weekly"] }) => <LoansChartImpl data={data} />;

const FORMAT = { num, cop } as const;

/** Cuenta desde el valor anterior: al arrancar sube desde 0; tras una mutación, desde lo que había. */
export function CountUp({ value, format = "num" }: { value: number; format?: keyof typeof FORMAT }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = prev.current;
    prev.current = value;
    if (reduce || from === value) {
      el.textContent = FORMAT[format](value);
      return;
    }
    const controls = animate(from, value, {
      duration: 0.9,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (v) => (el.textContent = FORMAT[format](Math.round(v))),
    });
    return () => controls.stop();
  }, [value, format, reduce]);

  return (
    <span ref={ref} className="num">
      {FORMAT[format](value)}
    </span>
  );
}

const TICKS = 61;
const START = 135; // el arco abre hacia abajo, como un tacómetro
const SWEEP = 270;
const R = 78;
const CIRC = 2 * Math.PI * R;
const ARC = CIRC * (SWEEP / 360);
const r2 = (n: number) => Math.round(n * 100) / 100; // mismo string en servidor y cliente

/**
 * Medidor de salud del inventario.
 * Marcas: % de componentes sobre su mínimo. Anillo interior: reparto en orden / bajo / agotado.
 */
export function HealthGauge({ value, ok, low, out }: { value: number; ok: number; low: number; out: number }) {
  const lit = Math.round((value / 100) * TICKS);
  const color = value >= 75 ? "var(--ok)" : value >= 45 ? "var(--warn)" : "var(--danger)";
  const total = ok + low + out || 1;
  const parts = [
    { n: ok, c: "var(--ok)" },
    { n: low, c: "var(--warn)" },
    { n: out, c: "var(--danger)" },
  ];
  let offset = 0;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[250px]">
      <svg viewBox="0 0 240 240" className="size-full" role="img" aria-label={`${value}% de los componentes están sobre su mínimo`}>
        {Array.from({ length: TICKS }, (_, i) => {
          const a = ((START + (i * SWEEP) / (TICKS - 1)) * Math.PI) / 180;
          const outer = i % 5 === 0 ? 114 : 110;
          const on = i < lit;
          return (
            <motion.line
              key={i}
              x1={r2(120 + Math.cos(a) * 94)}
              y1={r2(120 + Math.sin(a) * 94)}
              x2={r2(120 + Math.cos(a) * outer)}
              y2={r2(120 + Math.sin(a) * outer)}
              stroke={on ? color : "var(--input)"}
              strokeWidth={2.6}
              initial={{ opacity: 0.12 }}
              animate={{ opacity: on ? 1 : 0.5 }}
              transition={{ delay: 0.25 + i * 0.013, duration: 0.2 }}
            />
          );
        })}

        <g transform={`rotate(${START} 120 120)`} fill="none" strokeWidth={5}>
          <circle cx={120} cy={120} r={R} stroke="var(--plate)" strokeDasharray={`${r2(ARC)} ${r2(CIRC)}`} />
          {parts.map((p, i) => {
            const len = (p.n / total) * ARC;
            const dash = Math.max(len - 3, 0);
            const el = p.n > 0 && (
              <motion.circle
                key={i}
                cx={120}
                cy={120}
                r={R}
                stroke={p.c}
                strokeDasharray={`${r2(dash)} ${r2(CIRC)}`}
                strokeDashoffset={r2(-offset)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 + i * 0.12, duration: 0.4 }}
              />
            );
            offset += len;
            return el;
          })}
        </g>
      </svg>

      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="font-display text-[56px] font-bold leading-none" style={{ color }}>
            <CountUp value={value} />
            <span className="text-2xl">%</span>
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">sobre el mínimo</p>
        </div>
      </div>
    </div>
  );
}
