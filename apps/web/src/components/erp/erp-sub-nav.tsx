"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const groups: Array<{
  title: string;
  items: { href: string; label: string; exact?: boolean }[];
}> = [
  {
    title: "Operação do negócio",
    items: [
      { href: "/erp", label: "Painel", exact: true },
      { href: "/area-da-empresa/cadastro", label: "Empresa" },
      { href: "/erp/produtos", label: "Produtos" },
      { href: "/erp/clientes-fornecedores", label: "Clientes e fornecedores" },
      { href: "/erp/orcamentos", label: "Orçamentos" },
      { href: "/erp/pedidos-venda", label: "Vendas" },
      { href: "/erp/ordens-servico", label: "Ordens de serviço" },
      { href: "/erp/pedidos-compra", label: "Compras" },
      { href: "/erp/estoque", label: "Estoque" },
      { href: "/erp/financeiro", label: "Financeiro" },
    ],
  },
  {
    title: "Fiscal por perfil",
    items: [
      { href: "/erp/mei", label: "Central MEI" },
      { href: "/erp/dados-fiscais", label: "Dados fiscais" },
      { href: "/erp/fiscal", label: "Notas fiscais" },
    ],
  },
  {
    title: "Conseguir mais negócios",
    items: [
      { href: "/dashboard/meu-negocio", label: "Presença digital" },
      { href: "/marketplace", label: "Marketplace" },
      { href: "/oportunidades", label: "Oportunidades" },
    ],
  },
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
    <div className="mb-8 rounded-card border border-marinha-900/8 bg-surface-card p-4 shadow-card">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Área da empresa</p>
        <h2 className="mt-1 font-serif text-lg text-marinha-900">ERP + presença comercial</h2>
      </div>
      <nav className="grid gap-4 lg:grid-cols-3" aria-label="Módulos ERP">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-marinha-500">
              {group.title}
            </p>
            <div className="flex flex-wrap gap-2 lg:flex-col">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href, item.exact ?? false);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "focus-ring rounded-btn px-3 py-2 text-sm font-semibold transition-colors",
                      active
                        ? "bg-municipal-600/15 text-municipal-800"
                        : "text-marinha-600 hover:bg-municipal-600/10 hover:text-municipal-800",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
