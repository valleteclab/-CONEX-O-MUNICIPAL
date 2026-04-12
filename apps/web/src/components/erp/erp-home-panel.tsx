"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useErpBusiness } from "@/hooks/use-erp-business";

type QuickCard = {
  href: string;
  title: string;
  desc: string;
  badge: string;
};

const baseQuickCards: QuickCard[] = [
  {
    href: "/erp/pedidos-venda",
    title: "Vendas",
    desc: "Acompanhe pedidos, faturamento e evolução comercial da empresa.",
    badge: "Comercial",
  },
  {
    href: "/erp/ordens-servico",
    title: "Ordens de serviço",
    desc: "Controle execução, materiais e andamento dos atendimentos.",
    badge: "Serviços",
  },
  {
    href: "/erp/produtos",
    title: "Produtos",
    desc: "Revise o catálogo inicial e ajuste itens para venda ou execução.",
    badge: "Catálogo",
  },
  {
    href: "/erp/estoque",
    title: "Estoque",
    desc: "Acompanhe saldo, reposição e consumo dos itens do negócio.",
    badge: "Operação",
  },
  {
    href: "/erp/financeiro",
    title: "Financeiro",
    desc: "Controle contas, caixa e reflexos das vendas e serviços.",
    badge: "Gestão",
  },
  {
    href: "/erp/dados-fiscais",
    title: "Fiscal",
    desc: "Mantenha dados fiscais em dia para MEI ou pequena empresa.",
    badge: "Fiscal",
  },
];

const supportLinks = [
  {
    href: "/dashboard/meu-negocio",
    title: "Presença digital",
    desc: "Atualize perfil, catálogo e canais de contato da empresa.",
  },
  {
    href: "/oportunidades",
    title: "Oportunidades",
    desc: "Veja demandas abertas e publique novas solicitações.",
  },
];

const presetLabels: Record<string, string> = {
  beauty_salon: "Salão / Cabeleireiro",
  bakery: "Padaria",
  mini_market: "Mercadinho",
  auto_repair: "Oficina mecânica",
  bike_repair: "Oficina de bicicleta",
  locksmith: "Chaveiro",
};

function orderQuickCards(presetKey: string | null): QuickCard[] {
  const preferred = (() => {
    switch (presetKey) {
      case "beauty_salon":
        return ["/erp/ordens-servico", "/erp/produtos", "/erp/financeiro"];
      case "bakery":
      case "mini_market":
        return ["/erp/produtos", "/erp/estoque", "/erp/pedidos-venda"];
      case "auto_repair":
      case "bike_repair":
      case "locksmith":
        return ["/erp/ordens-servico", "/erp/orcamentos", "/erp/produtos"];
      default:
        return ["/erp/pedidos-venda", "/erp/financeiro", "/erp/dados-fiscais"];
    }
  })();

  const extraCards =
    presetKey === "auto_repair" || presetKey === "bike_repair" || presetKey === "locksmith"
      ? [
          {
            href: "/erp/orcamentos",
            title: "Orçamentos",
            desc: "Monte propostas antes de converter em venda ou execução.",
            badge: "Comercial",
          },
        ]
      : [];

  const full = [...baseQuickCards, ...extraCards];
  return [...full].sort((a, b) => {
    const aIndex = preferred.indexOf(a.href);
    const bIndex = preferred.indexOf(b.href);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}

export function ErpHomePanel() {
  const { selected } = useErpBusiness();
  const quickCards = orderQuickCards(selected?.segmentPresetKey ?? null);
  const presetLabel =
    selected?.segmentPresetKey ? presetLabels[selected.segmentPresetKey] ?? selected.segmentPresetKey : null;
  const presetConfig = selected?.fiscalConfig?.segmentPreset as
    | { erpFocus?: string[]; financeCategories?: { income?: string[]; expense?: string[] } }
    | undefined;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.5fr,1fr]">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Atalhos principais</p>
            <h2 className="mt-1 font-serif text-xl text-marinha-900">Comece pelo que usa mais</h2>
            {presetLabel ? (
              <p className="mt-2 text-sm text-marinha-600">
                Sequência sugerida para <strong>{presetLabel}</strong>.
              </p>
            ) : null}
          </div>
          <Badge tone="accent">ERP</Badge>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {quickCards.map((item) => (
            <Link key={item.href} href={item.href} className="group block focus-ring rounded-card">
              <Card className="h-full border border-marinha-900/6 transition-shadow duration-200 group-hover:shadow-card-hover">
                <Badge tone="neutral">{item.badge}</Badge>
                <h3 className="mt-3 font-serif text-lg text-marinha-900 group-hover:text-municipal-800">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-marinha-500">{item.desc}</p>
                <p className="mt-4 text-sm font-semibold text-municipal-700">Abrir →</p>
              </Card>
            </Link>
          ))}
        </div>
      </Card>

      <Card variant="featured">
        <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Apoio ao negócio</p>
        <h2 className="mt-1 font-serif text-xl text-marinha-900">
          {presetLabel ? `Preset ativo: ${presetLabel}` : "Também acompanhe sua presença comercial"}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-marinha-600">
          {presetLabel
            ? "O preset acelera a partida do negócio, mas todos os itens e textos continuam editáveis."
            : "Além da operação interna, você pode manter a empresa visível no portal e acompanhar novas demandas."}
        </p>

        {presetConfig?.erpFocus?.length ? (
          <div className="mt-4 rounded-btn border border-marinha-900/10 bg-white/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Focos sugeridos</p>
            <p className="mt-2 text-sm text-marinha-700">{presetConfig.erpFocus.join(" • ")}</p>
          </div>
        ) : null}

        {presetConfig?.financeCategories ? (
          <div className="mt-4 rounded-btn border border-marinha-900/10 bg-white/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Financeiro inicial</p>
            <p className="mt-2 text-sm text-marinha-700">
              Entradas: {(presetConfig.financeCategories.income ?? []).join(", ")}
            </p>
            <p className="mt-1 text-sm text-marinha-700">
              Saídas: {(presetConfig.financeCategories.expense ?? []).join(", ")}
            </p>
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          {supportLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-btn border border-marinha-900/10 bg-white/70 px-3 py-3 transition hover:border-municipal-600/30 hover:bg-white"
            >
              <p className="font-semibold text-marinha-900">{item.title}</p>
              <p className="mt-1 text-sm text-marinha-600">{item.desc}</p>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
