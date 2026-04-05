import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/layout/page-intro";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "ERP — Área da empresa",
};

const modules = [
  {
    href: "/erp/pdv",
    title: "PDV",
    desc: "Ponto de venda: catálogo rápido e cupom (touch e desktop).",
  },
  {
    href: "/erp/produtos",
    title: "Produtos",
    desc: "SKU, NCM, preços e estoque mínimo.",
  },
  {
    href: "/erp/clientes-fornecedores",
    title: "Clientes e fornecedores",
    desc: "Pessoas e empresas (CPF/CNPJ) para vendas e compras.",
  },
  {
    href: "/erp/estoque",
    title: "Estoque",
    desc: "Locais, saldos e movimentações.",
  },
  {
    href: "/erp/pedidos-venda",
    title: "Pedidos de venda",
    desc: "Orçamentos e pedidos com itens e totais.",
  },
  {
    href: "/erp/pedidos-compra",
    title: "Pedidos de compra",
    desc: "Pedidos a fornecedores.",
  },
  {
    href: "/erp/financeiro",
    title: "Financeiro",
    desc: "Contas a receber, a pagar e fluxo de caixa.",
  },
] as const;

export default function ErpPage() {
  return (
    <>
      <PageIntro
        title="ERP empresarial"
        description="Onda A: cadastros, estoque, pedidos e financeiro básico. Use o menu acima ou os atalhos abaixo para cada módulo."
        badge="Área da empresa"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {modules.map((m) => (
          <Link key={m.href} href={m.href} className="group block focus-ring rounded-card">
            <Card className="h-full transition-shadow duration-200 group-hover:shadow-card-hover">
              <h2 className="font-serif text-xl text-marinha-900 group-hover:text-municipal-800">
                {m.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-marinha-500">{m.desc}</p>
              <p className="mt-4 text-sm font-semibold text-municipal-700">Abrir →</p>
            </Card>
          </Link>
        ))}
      </div>

      <Card variant="featured" className="mt-8">
        <p className="text-sm text-marinha-600">
          <strong className="text-marinha-900">Primeiro acesso:</strong> crie um negócio em{" "}
          <code className="font-mono text-marinha-900">POST /api/v1/erp/businesses</code> e use o header{" "}
          <code className="font-mono text-marinha-900">X-Business-Id</code> nas demais rotas. Documentação interativa em{" "}
          <code className="font-mono text-marinha-900">/docs</code> na API.
        </p>
      </Card>
    </>
  );
}
