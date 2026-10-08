import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { LEVEL_LABEL, type StockLevel } from "@/lib/stock";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm border-l-2 px-2 py-0.5 text-xs font-medium leading-5 whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "border-input bg-plate text-muted-foreground",
        ion: "border-primary bg-primary/10 text-primary",
        ok: "border-ok bg-ok/10 text-ok",
        warn: "border-warn bg-warn/10 text-warn",
        danger: "border-danger bg-danger/10 text-danger",
        accent: "border-accent bg-accent/10 text-accent",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type Tone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

export function Badge({ className, tone, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export const LEVEL_TONE: Record<StockLevel, Tone> = { ok: "ok", low: "warn", out: "danger" };

export function LevelBadge({ level }: { level: StockLevel }) {
  return <Badge tone={LEVEL_TONE[level]}>{LEVEL_LABEL[level]}</Badge>;
}
