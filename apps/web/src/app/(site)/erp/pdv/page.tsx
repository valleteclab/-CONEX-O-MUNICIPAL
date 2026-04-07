import type { Metadata } from "next";
import { PdvPanel } from "@/components/erp/pdv-panel";
import { PageIntro } from "@/components/layout/page-intro";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "PDV — Ponto de venda",
};

export default function ErpPdvPage() {
  return (
    <>
      <PageIntro
        title="PDV — Ponto de venda"
        description="Use o caixa para vendas rápidas no balcão, consulta de itens e fechamento simples do atendimento."
        badge="Operação"
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card variant="featured">
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Atendimento</p>
          <p className="mt-2 text-lg font-bold text-marinha-900">Venda rápida</p>
          <p className="mt-1 text-sm text-marinha-500">Ideal para balcão, loja e atendimento direto ao cliente.</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Lançamento</p>
          <p className="mt-2 flex items-center gap-2 text-lg font-bold text-marinha-900">
            <Badge tone="accent">PDV</Badge>
            Catálogo + cupom
          </p>
          <p className="mt-1 text-sm text-marinha-500">Busque itens pelo código, nome ou SKU e monte o cupom em poucos toques.</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Fluxo</p>
          <p className="mt-2 text-lg font-bold text-marinha-900">Selecionar, conferir e finalizar</p>
          <p className="mt-1 text-sm text-marinha-500">Um fluxo simples para registrar a venda e seguir com a operação.</p>
        </Card>
      </div>

      <PdvPanel />
    </>
  );
}
