"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { erpFetch } from "@/lib/api-browser";
import type { ErpListResponse } from "@/lib/erp-list";
import { useErpBusiness } from "@/hooks/use-erp-business";

type QuickCard = {
  href: string;
  title: string;
  desc: string;
  badge: string;
};

type SalesOrder = { id: string; status: "draft" | "confirmed" | "cancelled"; totalAmount: string };
type PurchaseOrder = { id: string; status: "draft" | "confirmed" | "received" | "cancelled"; totalAmount: string };
type Product = { id: string; kind: "product" | "service"; name: string; price: string; minStock: string };
type FiscalDoc = { id: string; status: string; type: "nfse" | "nfe" | "nfce" };
type StockAlert = { productId: string; name: string; shortage: string };
type FinanceSummary = {
  cash: { totalIn: string; totalOut: string; balance: string; entries: number };
  receivables: { openCount: number; openAmount: string };
  payables: { openCount: number; openAmount: string };
};

const baseQuickCards: QuickCard[] = [
  {
    href: "/erp/pedidos-venda",
    title: "Vendas",
    desc: "Pedidos, faturamento e andamento comercial.",
    badge: "Comercial",
  },
  {
    href: "/erp/produtos",
    title: "Produtos",
    desc: "Cadastro de itens, importacao XML e ajustes.",
    badge: "Catalogo",
  },
  {
    href: "/erp/estoque",
    title: "Estoque",
    desc: "Saldos, alertas e movimentacoes.",
    badge: "Operacao",
  },
  {
    href: "/erp/financeiro",
    title: "Financeiro",
    desc: "Caixa, contas a receber e a pagar.",
    badge: "Gestao",
  },
  {
    href: "/erp/pedidos-compra",
    title: "Compras",
    desc: "Reposicao e recebimento de mercadorias.",
    badge: "Suprimentos",
  },
  {
    href: "/erp/fiscal",
    title: "Fiscal",
    desc: "Notas emitidas e situacao fiscal.",
    badge: "Fiscal",
  },
];

const presetLabels: Record<string, string> = {
  beauty_salon: "Salao / Cabeleireiro",
  bakery: "Padaria",
  mini_market: "Mercadinho",
  auto_repair: "Oficina mecanica",
  bike_repair: "Oficina de bicicleta",
  locksmith: "Chaveiro",
};

const fmtCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return value;
  return Number(value ?? 0);
}

function orderQuickCards(presetKey: string | null): QuickCard[] {
  const preferred = (() => {
    switch (presetKey) {
      case "beauty_salon":
        return ["/erp/ordens-servico", "/erp/financeiro", "/erp/produtos"];
      case "bakery":
      case "mini_market":
        return ["/erp/produtos", "/erp/estoque", "/erp/pedidos-venda"];
      case "auto_repair":
      case "bike_repair":
      case "locksmith":
        return ["/erp/ordens-servico", "/erp/orcamentos", "/erp/produtos"];
      default:
        return ["/erp/pedidos-venda", "/erp/financeiro", "/erp/produtos"];
    }
  })();

  const full =
    presetKey === "auto_repair" || presetKey === "bike_repair" || presetKey === "locksmith"
      ? [
          ...baseQuickCards,
          {
            href: "/erp/ordens-servico",
            title: "Servicos",
            desc: "Execucao, materiais e ordem de servico.",
            badge: "Servicos",
          },
        ]
      : baseQuickCards;

  return [...full].sort((a, b) => {
    const aIndex = preferred.indexOf(a.href);
    const bIndex = preferred.indexOf(b.href);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}

function MetricBar({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: "green" | "blue" | "amber" | "red";
}) {
  const tones = {
    green: "bg-green-500",
    blue: "bg-blue-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };
  const width = max <= 0 ? 0 : Math.max(10, Math.round((value / max) * 100));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm text-marinha-600">
        <span>{label}</span>
        <span className="font-semibold text-marinha-900">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-marinha-900/8">
        <div className={`h-2 rounded-full ${tones[tone]}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function ErpHomePanel() {
  const { selected } = useErpBusiness();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sales, setSales] = useState<SalesOrder[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [fiscalDocs, setFiscalDocs] = useState<FiscalDoc[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [finance, setFinance] = useState<FinanceSummary | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      setIsLoading(true);
      setLoadError(null);

      const today = new Date();
      const from = new Date(today);
      from.setDate(today.getDate() - 29);
      const fromDate = from.toISOString().slice(0, 10);
      const toDate = today.toISOString().slice(0, 10);

      const [salesRes, purchaseRes, productsRes, financeRes, stockRes, fiscalRes] = await Promise.all([
        erpFetch<ErpListResponse<SalesOrder>>("/api/v1/erp/sales-orders?take=200&skip=0"),
        erpFetch<ErpListResponse<PurchaseOrder>>("/api/v1/erp/purchase-orders?take=200&skip=0"),
        erpFetch<ErpListResponse<Product>>("/api/v1/erp/products?take=200&skip=0"),
        erpFetch<FinanceSummary>(`/api/v1/erp/finance/summary?from=${fromDate}&to=${toDate}`),
        erpFetch<StockAlert[]>("/api/v1/erp/stock/alerts/minimum"),
        erpFetch<ErpListResponse<FiscalDoc>>("/api/v1/erp/fiscal?take=100&skip=0"),
      ]);

      if (!salesRes.ok || !purchaseRes.ok || !productsRes.ok || !financeRes.ok || !stockRes.ok || !fiscalRes.ok) {
        setLoadError(
          salesRes.error ??
            purchaseRes.error ??
            productsRes.error ??
            financeRes.error ??
            stockRes.error ??
            fiscalRes.error ??
            "Nao foi possivel carregar o dashboard do ERP.",
        );
        setIsLoading(false);
        return;
      }

      setSales(salesRes.data?.items ?? []);
      setPurchases(purchaseRes.data?.items ?? []);
      setProducts(productsRes.data?.items ?? []);
      setFinance(financeRes.data ?? null);
      setStockAlerts(stockRes.data ?? []);
      setFiscalDocs(fiscalRes.data?.items ?? []);
      setIsLoading(false);
    }

    void loadDashboard();
  }, [selected?.id]);

  const presetLabel =
    selected?.segmentPresetKey ? presetLabels[selected.segmentPresetKey] ?? selected.segmentPresetKey : null;
  const quickCards = orderQuickCards(selected?.segmentPresetKey ?? null).slice(0, 6);

  const salesConfirmed = sales.filter((item) => item.status === "confirmed");
  const salesDraft = sales.filter((item) => item.status === "draft");
  const purchasesOpen = purchases.filter((item) => item.status === "draft" || item.status === "confirmed");
  const purchasesReceived = purchases.filter((item) => item.status === "received");
  const activeProducts = products.filter((item) => item.kind === "product");
  const services = products.filter((item) => item.kind === "service");
  const avgTicket =
    salesConfirmed.length > 0
      ? salesConfirmed.reduce((sum, item) => sum + toNumber(item.totalAmount), 0) / salesConfirmed.length
      : 0;
  const salesTotal = salesConfirmed.reduce((sum, item) => sum + toNumber(item.totalAmount), 0);
  const purchaseTotal = purchasesReceived.reduce((sum, item) => sum + toNumber(item.totalAmount), 0);
  const maxPipeline = Math.max(salesConfirmed.length, salesDraft.length, purchasesOpen.length, stockAlerts.length, 1);
  const revenueBarMax = Math.max(
    salesTotal,
    purchaseTotal,
    toNumber(finance?.receivables.openAmount),
    toNumber(finance?.payables.openAmount),
    1,
  );

  const heroSummary = useMemo(
    () => [
      {
        label: "Vendas confirmadas",
        value: salesConfirmed.length,
        helper: fmtCurrency.format(salesTotal),
      },
      {
        label: "Contas a receber",
        value: finance?.receivables.openCount ?? 0,
        helper: fmtCurrency.format(toNumber(finance?.receivables.openAmount)),
      },
      {
        label: "Estoque em alerta",
        value: stockAlerts.length,
        helper: stockAlerts.length > 0 ? `${stockAlerts.length} item(ns) abaixo do minimo` : "Sem alertas hoje",
      },
    ],
    [finance?.receivables.openAmount, finance?.receivables.openCount, salesConfirmed.length, salesTotal, stockAlerts.length],
  );

  if (loadError) {
    return (
      <Card className="border border-red-200 bg-red-50">
        <p className="text-sm font-semibold text-red-700">Nao foi possivel carregar o dashboard</p>
        <p className="mt-1 text-sm text-red-600">{loadError}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.4fr,0.9fr]">
        <Card className="overflow-hidden border-none bg-[linear-gradient(135deg,#083b66_0%,#0ea5a3_48%,#f4f8fb_140%)] text-white shadow-2xl">
          <div className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
            <div>
              <Badge tone="neutral" className="bg-white/20 text-white ring-0">
                Dashboard
              </Badge>
              <h2 className="mt-4 font-serif text-3xl leading-tight">
                {selected?.tradeName ?? "Seu negocio"}: acompanhe sua operacao em um so lugar
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-white/82">
                Veja rapidamente vendas, estoque, financeiro e fiscal para decidir o que precisa
                da sua atencao hoje.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {heroSummary.map((item) => (
                <div key={item.label} className="rounded-card border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-wide text-white/70">{item.label}</p>
                  <p className="mt-2 text-2xl font-bold">{item.value}</p>
                  <p className="mt-1 text-sm text-white/75">{item.helper}</p>
                </div>
                ))}
              </div>
            </div>

            <div className="rounded-card border border-white/12 bg-white/12 p-4 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/70">Painel rapido</p>
                  <h3 className="mt-1 text-xl font-semibold text-white">Visao do dia</h3>
                </div>
                {presetLabel ? (
                  <span className="rounded-full bg-white/18 px-3 py-1 text-xs font-semibold text-white/90">
                    {presetLabel}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-btn bg-white/10 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-white/65">Ticket medio</p>
                  <p className="mt-2 text-2xl font-bold text-white">{fmtCurrency.format(avgTicket)}</p>
                </div>
                <div className="rounded-btn bg-white/10 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-white/65">Saldo no periodo</p>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {fmtCurrency.format(toNumber(finance?.cash.balance))}
                  </p>
                </div>
                <div className="rounded-btn bg-white/10 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-white/65">Notas pendentes</p>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {fiscalDocs.filter((item) => item.status !== "authorized").length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-4">
          <Card className="bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Resumo diario</p>
                <h3 className="mt-1 font-serif text-2xl text-marinha-900">Resumo do dia</h3>
              </div>
              {isLoading ? <Badge tone="neutral">Atualizando...</Badge> : <Badge tone="accent">Ao vivo</Badge>}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-card border border-marinha-900/8 bg-surface p-4">
                <p className="text-xs uppercase tracking-wide text-marinha-500">Catalogo</p>
                <p className="mt-2 text-2xl font-bold text-marinha-900">{activeProducts.length}</p>
                <p className="mt-1 text-sm text-marinha-500">produtos ativos</p>
              </div>
              <div className="rounded-card border border-marinha-900/8 bg-surface p-4">
                <p className="text-xs uppercase tracking-wide text-marinha-500">Servicos</p>
                <p className="mt-2 text-2xl font-bold text-marinha-900">{services.length}</p>
                <p className="mt-1 text-sm text-marinha-500">servicos cadastrados</p>
              </div>
              <div className="rounded-card border border-marinha-900/8 bg-surface p-4">
                <p className="text-xs uppercase tracking-wide text-marinha-500">Caixa</p>
                <p className="mt-2 text-2xl font-bold text-marinha-900">{finance?.cash.entries ?? 0}</p>
                <p className="mt-1 text-sm text-marinha-500">lancamentos no periodo</p>
              </div>
              <div className="rounded-card border border-marinha-900/8 bg-surface p-4">
                <p className="text-xs uppercase tracking-wide text-marinha-500">Compras recebidas</p>
                <p className="mt-2 text-2xl font-bold text-marinha-900">{purchasesReceived.length}</p>
                <p className="mt-1 text-sm text-marinha-500">pedidos recebidos</p>
              </div>
            </div>
          </Card>

          <Card variant="featured">
            <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Atalhos de trabalho</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {quickCards.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-btn border border-marinha-900/8 bg-white px-4 py-4 transition hover:border-municipal-600/20 hover:bg-surface"
                >
                  <Badge tone="neutral">{item.badge}</Badge>
                  <p className="mt-3 font-semibold text-marinha-900">{item.title}</p>
                  <p className="mt-1 text-sm text-marinha-500">{item.desc}</p>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.92fr,1.08fr]">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Pipeline</p>
              <h3 className="mt-1 font-serif text-2xl text-marinha-900">Vendas, compras e estoque</h3>
            </div>
            <Badge tone="neutral">Ultimos registros</Badge>
          </div>

          <div className="mt-5 space-y-4">
            <MetricBar label="Pedidos confirmados" value={salesConfirmed.length} max={maxPipeline} tone="green" />
            <MetricBar label="Pedidos em rascunho" value={salesDraft.length} max={maxPipeline} tone="blue" />
            <MetricBar label="Compras abertas" value={purchasesOpen.length} max={maxPipeline} tone="amber" />
            <MetricBar label="Alertas de estoque" value={stockAlerts.length} max={maxPipeline} tone="red" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-btn border border-marinha-900/8 bg-surface p-4">
              <p className="text-xs uppercase tracking-wide text-marinha-500">Faturamento confirmado</p>
              <p className="mt-2 text-xl font-bold text-marinha-900">{fmtCurrency.format(salesTotal)}</p>
            </div>
            <div className="rounded-btn border border-marinha-900/8 bg-surface p-4">
              <p className="text-xs uppercase tracking-wide text-marinha-500">Recebimento de compras</p>
              <p className="mt-2 text-xl font-bold text-marinha-900">{fmtCurrency.format(purchaseTotal)}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Graficos</p>
              <h3 className="mt-1 font-serif text-2xl text-marinha-900">Financeiro</h3>
            </div>
            <Badge tone="accent">30 dias</Badge>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-card border border-marinha-900/8 bg-surface p-4">
              <p className="text-sm font-semibold text-marinha-900">Entradas e saidas</p>
              <div className="mt-4 space-y-3">
                <MetricBar
                  label="Entradas de caixa"
                  value={toNumber(finance?.cash.totalIn)}
                  max={revenueBarMax}
                  tone="green"
                />
                <MetricBar
                  label="Saidas de caixa"
                  value={toNumber(finance?.cash.totalOut)}
                  max={revenueBarMax}
                  tone="red"
                />
                <MetricBar
                  label="A receber"
                  value={toNumber(finance?.receivables.openAmount)}
                  max={revenueBarMax}
                  tone="blue"
                />
                <MetricBar
                  label="A pagar"
                  value={toNumber(finance?.payables.openAmount)}
                  max={revenueBarMax}
                  tone="amber"
                />
              </div>
            </div>

            <div className="rounded-card border border-marinha-900/8 bg-surface p-4">
              <p className="text-sm font-semibold text-marinha-900">O que precisa de atencao</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-btn border border-marinha-900/8 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-marinha-500">Notas pendentes</p>
                  <p className="mt-2 text-2xl font-bold text-marinha-900">
                    {fiscalDocs.filter((item) => item.status !== "authorized").length}
                  </p>
                </div>
                <div className="rounded-btn border border-marinha-900/8 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-marinha-500">Titulos em aberto</p>
                  <p className="mt-2 text-2xl font-bold text-marinha-900">
                    {(finance?.receivables.openCount ?? 0) + (finance?.payables.openCount ?? 0)}
                  </p>
                </div>
                <div className="rounded-btn border border-marinha-900/8 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-marinha-500">Estoque abaixo do minimo</p>
                  <p className="mt-2 text-2xl font-bold text-marinha-900">{stockAlerts.length}</p>
                  <p className="mt-1 text-sm text-marinha-500">
                    {stockAlerts[0]?.name ? `Primeiro alerta: ${stockAlerts[0].name}` : "Nenhum item em risco agora."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
