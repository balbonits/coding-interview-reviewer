import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const statusPillVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-muted-foreground",
        success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
        warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
        danger: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
        info: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

type StatusPillProps = React.ComponentProps<"span"> &
  VariantProps<typeof statusPillVariants>;

function StatusPill({ className, tone, ...props }: StatusPillProps) {
  return (
    <span
      data-slot="status-pill"
      className={cn(statusPillVariants({ tone }), className)}
      {...props}
    />
  );
}

export { StatusPill, statusPillVariants };
