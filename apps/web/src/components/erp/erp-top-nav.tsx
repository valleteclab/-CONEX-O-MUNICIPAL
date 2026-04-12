"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useErpBusiness } from "@/hooks/use-erp-business";

type NavGroup = {
  key: string;
  label: string;
  items: Array<{ href: string; label: string; desc: string; exact?: boolean }>;
};

const groups: NavGroup[] = [
  {
    key: "negocio",
    label: "Meu negocio",
    items: [
      { href: "/erp", label: "Inicio", desc: "Resumo do dia e atalhos principais.", exact: true },
      { href: "/area-da-empresa/cadastro", label: "Empresa", desc: "Dados cadastrais e perfil do negocio." },
      { href: "/dashboard/meu-negocio", label: "Presenca digital", desc: "Perfil publico, catalogo e contatos." },
    ],
  },
  {
    key: "cadastros",
    label: "Cadastros",
    items: [
      { href: "/erp/produtos", label: "Produtos", desc: "Cadastro de itens, importacao XML e ajustes." },
      { href: "/erp/clientes-fornecedores", label: "Clientes e fornecedores", desc: "Cadastro de clientes e parceiros." },
      { href: "/erp/estoque", label: "Estoque", desc: "Saldos, alertas e movimentacoes." },
      { href: "/erp/dados-fiscais", label: "Dados fiscais", desc: "Informacoes para emissao de notas." },
    ],
  },
  {
    key: "vendas",
    label: "Vendas",
    items: [
      { href: "/erp/pedidos-venda", label: "Pedidos de venda", desc: "Pedidos, confirmacoes e faturamento." },
      { href: "/erp/pdv", label: "PDV", desc: "Caixa rapido para vender e imprimir recibo." },
      { href: "/erp/orcamentos", label: "Orcamentos", desc: "Propostas antes de converter em venda." },
      { href: "/erp/ordens-servico", label: "Ordens de servico", desc: "Execucao e acompanhamento operacional." },
    ],
  },
  {
    key: "financeiro",
    label: "Financeiro",
    items: [
      { href: "/erp/financeiro", label: "Resumo financeiro", desc: "Caixa, contas a receber e a pagar." },
      { href: "/erp/pedidos-compra", label: "Compras", desc: "Compras, recebimento e abastecimento." },
      { href: "/erp/fiscal", label: "Notas fiscais", desc: "Emitir, acompanhar e consultar notas." },
      { href: "/erp/mei", label: "Central MEI", desc: "Rotinas e informacoes do MEI." },
    ],
  },
];

function isActive(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ErpTopNav() {
  const pathname = usePathname();
  const { businesses, selectedId, selected, isLoading, error, hasApproved, selectBusiness } = useErpBusiness();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setOpenGroup(null);
  }, [pathname]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!navRef.current?.contains(event.target as Node)) {
        setOpenGroup(null);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenGroup(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const approved = useMemo(
    () => businesses.filter((b) => b.moderationStatus === "approved" && b.isActive),
    [businesses],
  );

  const activeGroupKey =
    groups.find((group) => group.items.some((item) => isActive(pathname, item.href, item.exact)))?.key ?? null;

  return (
    <div className="sticky top-0 z-40 mb-6 border-b border-marinha-900/8 bg-white/92 backdrop-blur">
      <div className="flex w-full flex-col gap-4 px-3 py-3 lg:px-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-municipal-600 text-lg font-bold text-white shadow-sm">
              E
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-marinha-500">Area da empresa</p>
              <h1 className="font-serif text-xl text-marinha-900">ERP do negocio</h1>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3 xl:max-w-[720px] xl:items-end">
            <div className="w-full rounded-full border border-marinha-900/8 bg-surface px-4 py-2.5 text-sm text-marinha-400 shadow-sm">
              Pesquisar paginas e atalhos...
            </div>
            {isLoading ? (
              <div className="h-10 w-full animate-pulse rounded-btn bg-marinha-900/10 xl:w-80" />
            ) : error ? (
              <div className="w-full rounded-btn border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 xl:w-auto">
                {error}
              </div>
            ) : businesses.length === 0 ? (
              <div className="w-full rounded-btn border border-municipal-200 bg-municipal-50 px-4 py-2 text-sm text-municipal-800 xl:w-auto">
                Cadastre uma empresa para começar a usar o ERP.
              </div>
            ) : !hasApproved ? (
              <div className="w-full rounded-btn border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-800 xl:w-auto">
                Sua empresa ainda esta em analise.
              </div>
            ) : (
              <div className="flex w-full flex-col gap-2 xl:w-auto xl:flex-row xl:items-center">
                <div className="rounded-full bg-municipal-100 px-3 py-1 text-sm font-semibold text-municipal-800">
                  {selected?.tradeName ?? "Selecione um negocio"}
                </div>
                {approved.length > 1 ? (
                  <select
                    value={selectedId ?? ""}
                    onChange={(event) => selectBusiness(event.target.value)}
                    className="rounded-full border border-marinha-900/20 bg-white px-4 py-2 text-sm text-marinha-800 focus:outline-none focus:ring-2 focus:ring-municipal-500"
                  >
                    {!selectedId ? <option value="">Selecione um negocio</option> : null}
                    {approved.map((business) => (
                      <option key={business.id} value={business.id}>
                        {business.tradeName}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div ref={navRef} className="rounded-card border border-marinha-900/8 bg-surface-card px-3 py-2 shadow-card">
          <div className="flex flex-wrap items-center gap-2">
            {groups.map((group) => {
              const active =
                activeGroupKey === group.key ||
                group.items.some((item) => isActive(pathname, item.href, item.exact));
              return (
                <div
                  key={group.key}
                  className="relative"
                >
                  <button
                    type="button"
                    onClick={() => setOpenGroup((current) => (current === group.key ? null : group.key))}
                    aria-expanded={openGroup === group.key}
                    aria-haspopup="menu"
                    className={cn(
                      "focus-ring rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                      active
                        ? "bg-municipal-600 text-white"
                        : "bg-white text-marinha-700 hover:bg-municipal-600/10 hover:text-municipal-800",
                    )}
                  >
                    {group.label}
                  </button>

                  {openGroup === group.key ? (
                    <div className="absolute left-0 top-[calc(100%+0.75rem)] w-[min(96vw,760px)] rounded-card border border-marinha-900/8 bg-white p-5 shadow-2xl">
                      <div className="grid gap-4 md:grid-cols-2">
                        {group.items.map((item) => {
                          const itemActive = isActive(pathname, item.href, item.exact);
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setOpenGroup(null)}
                              className={cn(
                                "rounded-btn border px-4 py-4 transition",
                                itemActive
                                  ? "border-municipal-600/30 bg-municipal-600/8"
                                  : "border-marinha-900/6 hover:border-municipal-600/20 hover:bg-surface",
                              )}
                            >
                              <p className="font-semibold text-marinha-900">{item.label}</p>
                              <p className="mt-1 text-sm text-marinha-500">{item.desc}</p>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}

            <div className="ml-auto hidden items-center gap-2 md:flex">
              <Button variant="ghost" className="min-h-[40px] rounded-full px-4 py-2">
                Alertas
              </Button>
              <Button variant="secondary" className="min-h-[40px] rounded-full px-4 py-2">
                Ajustes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
