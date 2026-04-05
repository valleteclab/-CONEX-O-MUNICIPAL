"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const items: { href: string; label: string; exact?: boolean }[] = [
  { href: "/erp", label: "Início", exact: true },
  { href: "/erp/pdv", label: "PDV" },
  { href: "/erp/produtos", label: "Produtos" },
  { href: "/erp/clientes-fornecedores", label: "Clientes e fornecedores" },
  { href: "/erp/estoque", label: "Estoque" },
  { href: "/erp/pedidos-venda", label: "Pedidos de venda" },
  { href: "/erp/pedidos-compra", label: "Pedidos de compra" },
  { href: "/erp/financeiro", label: "Financeiro" },
  { href: "/erp/fiscal", label: "Notas Fiscais" },
];

function isActive(pathname: string, href: string, exact: boolean) {
  if (exact) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ErpSubNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mb-8 flex flex-wrap gap-1 border-b border-marinha-900/10 pb-1"
      aria-label="Módulos ERP"
    >
      {items.map((item) => {
        const active = isActive(pathname, item.href, item.exact ?? false);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "focus-ring rounded-t-btn px-3 py-2 text-sm font-semibold transition-colors",
              active
                ? "bg-municipal-600/15 text-municipal-800"
                : "text-marinha-600 hover:bg-municipal-600/10 hover:text-municipal-800",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
