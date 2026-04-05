import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "accent";

const tone: Record<BadgeTone, string> = {
  neutral: "bg-marinha-900/8 text-marinha-900",
  success: "bg-sucesso-500/15 text-marinha-900",
  warning: "bg-cerrado-500/20 text-marinha-900",
  danger: "bg-alerta-500/15 text-marinha-900",
  accent: "bg-municipal-600/12 text-municipal-700",
};

export function Badge({
  tone: t = "neutral",
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tone[t],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
