import { cn } from "@/lib/utils";
import { stockLevel } from "@/lib/stock";

const FILL = { ok: "bg-ok", low: "bg-warn", out: "bg-danger" } as const;

/** Barra segmentada: la escala completa es 2× el mínimo, así la marca del mínimo queda al centro. */
export function StockMeter({ qty, min, className }: { qty: number; min: number; className?: string }) {
  const segments = 10;
  const scale = Math.max(min * 2, qty, 1);
  const lit = qty <= 0 ? 0 : Math.max(1, Math.round((qty / scale) * segments));
  const level = stockLevel(qty, min);
  return (
    <div className={cn("flex h-2 gap-[2px]", className)} role="img" aria-label={`${qty} en stock, mínimo ${min}`}>
      {Array.from({ length: segments }, (_, i) => (
        <span key={i} className={cn("flex-1", i < lit ? FILL[level] : level === "out" ? "bg-danger/20" : "bg-input/70")} />
      ))}
    </div>
  );
}

/** Proporción ok / bajo / agotado de un grupo. */
export function LevelBar({ ok, low, out, className }: { ok: number; low: number; out: number; className?: string }) {
  const total = ok + low + out || 1;
  return (
    <div className={cn("flex h-1.5 gap-[2px]", className)} role="img" aria-label={`${ok} en orden, ${low} bajo mínimo, ${out} agotados`}>
      {ok > 0 && <span className="bg-ok" style={{ flex: ok / total }} />}
      {low > 0 && <span className="bg-warn" style={{ flex: low / total }} />}
      {out > 0 && <span className="bg-danger" style={{ flex: out / total }} />}
    </div>
  );
}
