import { cn } from "@/lib/cn";

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
} as const;

export function Avatar({
  label,
  size = "md",
  className,
}: {
  label: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const initials = label
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-municipal-600/15 font-semibold text-municipal-700",
        sizes[size],
        className,
      )}
      aria-hidden
    >
      {initials || "?"}
    </span>
  );
}
