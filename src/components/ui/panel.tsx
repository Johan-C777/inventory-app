import { cn } from "@/lib/utils";

type PanelProps = React.ComponentProps<"section"> & { tone?: "default" | "danger" | "warn" | "quiet" };

export function Panel({ className, tone = "default", ...props }: PanelProps) {
  return <section className={cn("hud", tone !== "default" && `hud-${tone}`, className)} {...props} />;
}

export function PanelHeader({
  title,
  hint,
  action,
  className,
}: {
  title: string;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex items-start justify-between gap-4 px-5 pt-5 pb-3", className)}>
      <div className="min-w-0">
        <h2 className="text-base leading-tight">{title}</h2>
        {hint && <p className="mt-0.5 text-[13px] text-muted-foreground">{hint}</p>}
      </div>
      {action}
    </header>
  );
}

export function PageHeader({ title, lead, children }: { title: string; lead?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl leading-tight sm:text-[28px]">{title}</h1>
        {lead && <p className="mt-1 max-w-[62ch] text-muted-foreground">{lead}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Empty({ title, children, icon }: { title: string; children?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      {icon && <div className="text-muted-foreground/60 [&_svg]:size-8">{icon}</div>}
      <p className="font-display text-base">{title}</p>
      {children && <div className="max-w-[46ch] text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}
