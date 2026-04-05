import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "accent"
  | "ghost"
  | "danger";

const styles: Record<ButtonVariant, string> = {
  primary:
    "bg-municipal-600 text-white hover:bg-municipal-700 shadow-sm active:scale-[0.98]",
  secondary:
    "bg-white text-marinha-900 border-2 border-marinha-500/25 hover:border-municipal-600/40 hover:bg-surface",
  accent:
    "bg-cerrado-500 text-marinha-900 hover:bg-cerrado-600 font-medium",
  ghost:
    "bg-transparent text-municipal-700 hover:bg-municipal-600/10 text-municipal-700",
  danger: "bg-alerta-500 text-white hover:bg-red-600 shadow-sm",
};

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-btn px-4 py-2.5 text-sm font-semibold transition-all focus-ring disabled:opacity-50 disabled:pointer-events-none min-h-[44px]",
        styles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
