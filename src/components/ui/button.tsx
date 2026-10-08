import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-display font-semibold tracking-wide transition-[filter,background-color,color,transform] duration-150 select-none active:translate-y-px disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--silk)] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "cut-sm bg-primary text-primary-foreground hover:brightness-110",
        secondary: "cut-sm bg-plate text-foreground hover:bg-input",
        ghost: "rounded-md text-muted-foreground hover:bg-plate hover:text-foreground",
        ok: "cut-sm bg-ok/15 text-ok hover:bg-ok/25",
        warn: "cut-sm bg-warn/15 text-warn hover:bg-warn/25",
        danger: "cut-sm bg-danger/15 text-danger hover:bg-danger/25",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "size-9",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
