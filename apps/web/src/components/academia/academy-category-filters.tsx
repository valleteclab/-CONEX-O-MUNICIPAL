import Link from "next/link";
import { cn } from "@/lib/cn";

export function AcademyCategoryFilters({
  categories,
  active,
}: {
  categories: string[];
  active: string;
}) {
  if (!categories.length) {
    return null;
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-marinha-900/10 pb-5">
      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-marinha-500">
        Categorias
      </span>
      <Link
        href="/academia"
        className={cn(
          "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
          !active ?
            "bg-municipal-600 text-white shadow-sm"
          : "bg-white text-marinha-700 ring-1 ring-marinha-900/10 hover:bg-marinha-900/5",
        )}
      >
        Todas
      </Link>
      {categories.map((cat) => (
        <Link
          key={cat}
          href={`/academia?categoria=${encodeURIComponent(cat)}`}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
            active === cat ?
              "bg-municipal-600 text-white shadow-sm"
            : "bg-white text-marinha-700 ring-1 ring-marinha-900/10 hover:bg-marinha-900/5",
          )}
        >
          {cat}
        </Link>
      ))}
    </div>
  );
}
