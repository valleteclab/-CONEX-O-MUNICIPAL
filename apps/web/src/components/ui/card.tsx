import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type CardVariant = "default" | "featured" | "compact";

const cardStyles: Record<CardVariant, string> = {
  default: "bg-surface-card shadow-card hover:shadow-card-hover",
  featured:
    "bg-surface-card shadow-card ring-2 ring-municipal-600/25 hover:shadow-card-hover",
  compact: "bg-surface-card shadow-card",
};

export function Card({
  variant = "default",
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-marinha-900/6 transition-shadow duration-200",
        variant === "compact" ? "p-4" : "p-6",
        cardStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
