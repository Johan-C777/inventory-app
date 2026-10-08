"use client";

import { MotionConfig } from "motion/react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // reducedMotion="user": Motion respeta la preferencia del sistema sin tocar cada animación
    <MotionConfig reducedMotion="user">
      {children}
      <Toaster
        theme="dark"
        position="bottom-right"
        offset={20}
        mobileOffset={{ bottom: 88 }}
        toastOptions={{
          classNames: {
            toast: "!rounded-[3px] !border !border-input !bg-popover !text-foreground !font-sans !shadow-2xl !shadow-black/50",
            description: "!text-muted-foreground",
            actionButton: "!bg-primary !text-primary-foreground !font-semibold",
            success: "!border-l-2 !border-l-ok",
            error: "!border-l-2 !border-l-danger",
            warning: "!border-l-2 !border-l-warn",
          },
        }}
      />
    </MotionConfig>
  );
}
