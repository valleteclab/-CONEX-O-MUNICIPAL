import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/layout/page-intro";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "ERP — Área da empresa",
};

const operationCards = [
  {
    href: "/erp/produtos",
    title: "Produtos e serviços",
    desc: "Organize catálogo, tipos de item, preços e base para estoque ou execução.",
    badge: "Cadastros",
  },
  {
    href: "/erp/orcamentos",
    title: "Orçamentos",
    desc: "Monte propostas, negocie e converta para venda ou ordem de serviço.",
    badge: "Comercial",
  },
  {
    href: "/erp/pedidos-venda",
    title: "Vendas",
    desc: "Feche pedidos, acompanhe origem e avance para faturamento.",
    badge: "Comércio",
  },
  {
    href: "/erp/ordens-servico",
    title: "Ordens de serviço",
    desc: "Gerencie execução, agenda, materiais e recebimento da prestação.",
    badge: "Serviços",
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

const growthCards = [
  {
    href: "/dashboard/meu-negocio",
    title: "Presença digital",
    desc: "Gerencie diretório, contatos, serviços e catálogo inicial.",
  },
  {
    href: "/marketplace",
    title: "Marketplace local",
    desc: "Exiba catálogo público e facilite pedidos de interesse e orçamento.",
  },
  {
    href: "/oportunidades",
    title: "Oportunidades",
    desc: "Publique demandas privadas ou públicas e receba respostas.",
  },
];

export default function ErpPage() {
  return (
    <>
      <PageIntro
        title="Área da empresa"
        description="Dois pilares em um só lugar: operar o negócio com ERP e conquistar mais negócios com presença digital, marketplace e oportunidades."
        badge="Área da empresa"
      />

      <div className="mb-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Pilar 1</p>
              <h2 className="mt-1 font-serif text-xl text-marinha-900">Operação do negócio</h2>
            </div>
            <Badge tone="accent">ERP</Badge>
          </div>
          <p className="mt-2 text-sm text-marinha-500">
            Comércio e serviços passam a caminhar juntos: produtos, clientes, orçamentos, vendas, ordens de serviço, financeiro e fiscal.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {operationCards.map((m) => (
              <Link key={m.href} href={m.href} className="group block focus-ring rounded-card">
                <Card className="h-full border border-marinha-900/6 transition-shadow duration-200 group-hover:shadow-card-hover">
                  <Badge tone="neutral">{m.badge}</Badge>
                  <h3 className="mt-3 font-serif text-lg text-marinha-900 group-hover:text-municipal-800">
                    {m.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-marinha-500">{m.desc}</p>
                  <p className="mt-4 text-sm font-semibold text-municipal-700">Abrir →</p>
                </Card>
              </Link>
            ))}
          </div>
        </Card>

        <Card variant="featured">
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Pilar 2</p>
          <h2 className="mt-1 font-serif text-xl text-marinha-900">Conseguir mais negócios</h2>
          <div className="mt-4 space-y-3 text-sm text-marinha-600">
            <p>
              <strong className="text-marinha-900">1.</strong> Monte seu perfil público com contatos, serviços e catálogo.
            </p>
            <p>
              <strong className="text-marinha-900">2.</strong> Apareça no diretório e no marketplace local.
            </p>
            <p>
              <strong className="text-marinha-900">3.</strong> Receba e responda oportunidades privadas ou públicas.
            </p>
          </div>
          <div className="mt-5 space-y-3">
            {growthCards.map((item) => (
              <Link key={item.href} href={item.href} className="block rounded-btn border border-marinha-900/10 bg-white/70 px-3 py-3 transition hover:border-municipal-600/30 hover:bg-white">
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
