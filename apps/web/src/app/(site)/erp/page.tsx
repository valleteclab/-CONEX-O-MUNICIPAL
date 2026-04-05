import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/layout/page-intro";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "ERP — Área da empresa",
};

export default function ErpPage() {
  return (
    <>
      <PageIntro
        title="ERP empresarial"
        description="Cadastros, estoque, pedidos e financeiro básico (Onda A). A API já expõe endpoints em /api/v1/erp — a interface web será conectada em seguida."
        badge="Onda A"
      />
      <Card variant="featured" className="mb-6">
        <p className="text-sm text-marinha-600">
          Para usar a API: autentique-se, crie um negócio em{" "}
          <code className="font-mono text-marinha-900">POST /erp/businesses</code> e envie o header{" "}
          <code className="font-mono text-marinha-900">X-Business-Id</code> nas demais rotas.
        </p>
      </Card>
      <div className="flex flex-wrap gap-3">
        <Button variant="primary" disabled>
          Abrir painel ERP (em breve)
        </Button>
        <Link
          href="/design-system"
          className="focus-ring inline-flex min-h-[44px] items-center justify-center rounded-btn px-4 py-2.5 text-sm font-semibold text-municipal-800 hover:bg-municipal-600/10"
        >
          Ver guia visual
        </Link>
      </div>
    </>
  );
}
