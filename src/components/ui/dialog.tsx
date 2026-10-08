"use client";

import { Dialog as RD } from "radix-ui";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZE = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" } as const;

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  size?: keyof typeof SIZE;
  children: React.ReactNode;
};

/** Radix (foco, Escape, aria) + entrada con resorte de Motion. */
export function Dialog({ open, onOpenChange, title, description, size = "md", children }: DialogProps) {
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <RD.Portal forceMount>
            <RD.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/65 p-4 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <RD.Content asChild forceMount>
                  <motion.div
                    className={cn("hud w-full outline-none", SIZE[size])}
                    initial={{ opacity: 0, y: 28, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.12 } }}
                    transition={{ type: "spring", stiffness: 440, damping: 32, mass: 0.9 }}
                  >
                    <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
                      <div className="min-w-0">
                        <RD.Title className="font-display text-lg font-semibold leading-tight">{title}</RD.Title>
                        {description ? (
                          <RD.Description className="mt-1 text-sm text-muted-foreground">{description}</RD.Description>
                        ) : (
                          <RD.Description className="sr-only">{title}</RD.Description>
                        )}
                      </div>
                      <RD.Close
                        className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-plate hover:text-foreground"
                        aria-label="Cerrar"
                      >
                        <X className="size-4" />
                      </RD.Close>
                    </div>
                    <div className="px-6 py-5">{children}</div>
                  </motion.div>
                </RD.Content>
              </motion.div>
            </RD.Overlay>
          </RD.Portal>
        )}
      </AnimatePresence>
    </RD.Root>
  );
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex flex-wrap justify-end gap-2">{children}</div>;
}
