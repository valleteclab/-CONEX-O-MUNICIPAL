"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const groups: Array<{
  title: string;
  items: { href: string; label: string; exact?: boolean }[];
}> = [
  {
    title: "Principal",
    items: [
      { href: "/erp", label: "Visão geral", exact: true },
      { href: "/area-da-empresa/cadastro", label: "Empresa" },
      { href: "/dashboard/meu-negocio", label: "Presença digital" },
    ],
  },
  {
    title: "Operação",
    items: [
      { href: "/erp/produtos", label: "Produtos" },
      { href: "/erp/clientes-fornecedores", label: "Clientes" },
      { href: "/erp/orcamentos", label: "Orçamentos" },
      { href: "/erp/pedidos-venda", label: "Vendas" },
      { href: "/erp/pdv", label: "PDV" },
      { href: "/erp/ordens-servico", label: "Serviços" },
      { href: "/erp/estoque", label: "Estoque" },
      { href: "/erp/financeiro", label: "Financeiro" },
      { href: "/erp/pedidos-compra", label: "Compras" },
    ],
  },
  {
    title: "Fiscal",
    items: [
      { href: "/erp/mei", label: "Central MEI" },
      { href: "/erp/dados-fiscais", label: "Dados fiscais" },
      { href: "/erp/fiscal", label: "Notas fiscais" },
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
    <div className="mb-6 rounded-card border border-marinha-900/8 bg-surface-card p-4 shadow-card">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Área da empresa</p>
          <h2 className="mt-1 font-serif text-lg text-marinha-900">ERP do negócio</h2>
        </div>
        <p className="text-sm text-marinha-500">
          Acesse os módulos principais sem sair da rotina da empresa.
        </p>
      </div>

      <nav className="space-y-4" aria-label="Navegação do ERP">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-marinha-500">{group.title}</p>
            <div className="flex flex-wrap gap-2">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href, item.exact ?? false);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "focus-ring rounded-full border px-3 py-2 text-sm font-semibold transition-colors",
                      active
                        ? "border-municipal-600 bg-municipal-600 text-white"
                        : "border-marinha-900/10 bg-white text-marinha-700 hover:border-municipal-600/35 hover:text-municipal-800",
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
