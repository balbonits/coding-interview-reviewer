import * as React from "react";

import { cn } from "@/lib/utils";

type OptionCardProps = Omit<React.ComponentProps<"button">, "title"> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
};

export function OptionCard({
  title,
  description,
  footer,
  className,
  ...props
}: OptionCardProps) {
  return (
    <button
      type="button"
      data-slot="option-card"
      className={cn(
        "group/option-card flex flex-col gap-1 rounded-xl bg-card p-4 text-left text-sm text-card-foreground ring-1 ring-foreground/10 transition-colors",
        "enabled:hover:ring-foreground/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    >
      <div className="font-heading text-base font-medium leading-snug">
        {title}
      </div>
      {description ? (
        <p className="text-muted-foreground">{description}</p>
      ) : null}
      {footer ? (
        <div className="mt-1 text-xs text-muted-foreground">{footer}</div>
      ) : null}
    </button>
  );
}
