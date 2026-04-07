import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/layout/page-intro";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "ERP — Área da empresa",
};

const quickActions = [
  {
    href: "/erp/cadastrar-negocio",
    title: "Empresa",
    desc: "Cadastre ou revise os dados do seu negócio para operar no sistema.",
  },
  {
    href: "/erp/produtos",
    title: "Produtos",
    desc: "Organize catálogo, preços, unidades e estoque mínimo.",
  },
  {
    href: "/erp/clientes-fornecedores",
    title: "Clientes e fornecedores",
    desc: "Mantenha seus contatos de venda e compra atualizados.",
  },
  {
    href: "/erp/pedidos-venda",
    title: "Vendas",
    desc: "Acompanhe orçamentos, pedidos e próximos faturamentos.",
  },
  {
    href: "/erp/pedidos-compra",
    title: "Compras",
    desc: "Registre pedidos de compra e acompanhe recebimentos.",
  },
  {
    href: "/erp/financeiro",
    title: "Financeiro",
    desc: "Controle recebimentos, pagamentos e movimentações de caixa.",
  },
];

const operationAreas = [
  {
    href: "/erp/pdv",
    title: "Frente de caixa",
    desc: "Venda rápida para atendimento presencial e balcão.",
    badge: "Vendas",
  },
  {
    href: "/erp/estoque",
    title: "Estoque",
    desc: "Consulte saldos, entradas, saídas e alertas de reposição.",
    badge: "Operação",
  },
  {
    href: "/erp/dados-fiscais",
    title: "Fiscal",
    desc: "Complete os dados da empresa e prepare a emissão de notas.",
    badge: "Fiscal",
  },
] as const;

export default function ErpPage() {
  return (
    <>
      <PageIntro
        title="Área da empresa"
        description="Gerencie sua operação em um só lugar: cadastros, vendas, compras, estoque, financeiro e fiscal."
        badge="Área da empresa"
      />

      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="font-serif text-xl text-marinha-900">Atalhos principais</h2>
          <p className="mt-2 text-sm text-marinha-500">
            Comece pelos cadastros e avance para a operação diária do negócio.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {quickActions.map((m) => (
              <Link key={m.href} href={m.href} className="group block focus-ring rounded-card">
                <Card className="h-full border border-marinha-900/6 transition-shadow duration-200 group-hover:shadow-card-hover">
                  <h3 className="font-serif text-lg text-marinha-900 group-hover:text-municipal-800">
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
          <h2 className="font-serif text-xl text-marinha-900">Rotina operacional</h2>
          <div className="mt-4 space-y-3 text-sm text-marinha-600">
            <p>
              <strong className="text-marinha-900">1.</strong> Cadastre a empresa e revise os dados fiscais.
            </p>
            <p>
              <strong className="text-marinha-900">2.</strong> Organize produtos, clientes e fornecedores.
            </p>
            <p>
              <strong className="text-marinha-900">3.</strong> Registre vendas, compras e acompanhe o financeiro.
            </p>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {operationAreas.map((m) => (
          <Link key={m.href} href={m.href} className="group block focus-ring rounded-card">
            <Card className="h-full transition-shadow duration-200 group-hover:shadow-card-hover">
              <Badge tone="accent">{m.badge}</Badge>
              <h2 className="mt-3 font-serif text-xl text-marinha-900 group-hover:text-municipal-800">
                {m.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-marinha-500">{m.desc}</p>
              <p className="mt-4 text-sm font-semibold text-municipal-700">Abrir →</p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
