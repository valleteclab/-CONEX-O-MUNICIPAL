import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

export function PageIntro({
  title,
  description,
  badge,
  className,
  children,
}: {
  title: string;
  description?: string;
  badge?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <header className={cn("mb-8", className)}>
      {badge ? (
        <Badge tone="accent" className="mb-3">
          {badge}
        </Badge>
      ) : null}
      <h1 className="font-serif text-3xl font-bold tracking-tight text-marinha-900 sm:text-4xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-2 text-base text-marinha-500">{description}</p>
      ) : null}
      {children}
    </header>
  );
}
