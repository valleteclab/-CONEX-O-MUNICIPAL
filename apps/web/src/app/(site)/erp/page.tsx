import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/layout/page-intro";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "ERP — Área da empresa",
};

const quickCards = [
  {
    href: "/erp/pdv",
    title: "PDV",
    desc: "Venda rápida no balcão com consulta de itens e fechamento simples.",
    badge: "Atendimento",
  },
  {
    href: "/erp/pedidos-venda",
    title: "Vendas",
    desc: "Acompanhe pedidos, faturamento e evolução comercial da empresa.",
    badge: "Comercial",
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

export default function ErpPage() {
  return (
    <>
      <PageIntro
        title="Painel do ERP"
        description="Acompanhe a operação da empresa e entre rápido nos módulos mais usados do dia a dia."
        badge="Área da empresa"
      />

      <div className="grid gap-4 lg:grid-cols-[1.5fr,1fr]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Atalhos principais</p>
              <h2 className="mt-1 font-serif text-xl text-marinha-900">Comece pelo que usa mais</h2>
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
          <h2 className="mt-1 font-serif text-xl text-marinha-900">Também acompanhe sua presença comercial</h2>
          <p className="mt-3 text-sm leading-relaxed text-marinha-600">
            Além da operação interna, você pode manter a empresa visível no portal e acompanhar novas demandas.
          </p>

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
    </>
  );
}
