"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const groups: Array<{
  title: string;
  items: { href: string; label: string; exact?: boolean }[];
}> = [
  {
    title: "Principal",
    items: [
      { href: "/erp", label: "Visao geral", exact: true },
      { href: "/area-da-empresa/cadastro", label: "Empresa" },
      { href: "/dashboard/meu-negocio", label: "Presenca digital" },
    ],
  },
  {
    title: "Operacao",
    items: [
      { href: "/erp/produtos", label: "Produtos" },
      { href: "/erp/clientes-fornecedores", label: "Clientes" },
      { href: "/erp/orcamentos", label: "Orcamentos" },
      { href: "/erp/pedidos-venda", label: "Vendas" },
      { href: "/erp/pdv", label: "PDV" },
      { href: "/erp/ordens-servico", label: "Servicos" },
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

const STORAGE_KEY = "erp-sub-nav-collapsed";

function isActive(pathname: string, href: string, exact: boolean) {
  if (exact) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ErpSubNav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "true");
    } catch {
      setCollapsed(false);
    } finally {
      setReady(true);
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  }

  return (
    <div className="mb-6 rounded-card border border-marinha-900/8 bg-surface-card p-4 shadow-card">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Area da empresa</p>
          <h2 className="mt-1 font-serif text-lg text-marinha-900">ERP do negocio</h2>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          <p className="text-sm text-marinha-500">
            Acesse os modulos principais sem sair da rotina da empresa.
          </p>
          <Button
            variant="secondary"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-controls="erp-sub-nav-groups"
            className="w-full px-3 py-2 md:w-auto"
          >
            {collapsed ? "Mostrar menu" : "Esconder menu"}
          </Button>
        </div>
      </div>

      {!collapsed ? (
        <nav id="erp-sub-nav-groups" className="mt-4 space-y-4" aria-label="Navegacao do ERP">
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
      ) : null}

      {collapsed && ready ? (
        <p className="mt-4 text-sm text-marinha-500">Menu do ERP recolhido. Use o botao de mostrar menu quando quiser navegar.</p>
      ) : null}
    </div>
  );
}
