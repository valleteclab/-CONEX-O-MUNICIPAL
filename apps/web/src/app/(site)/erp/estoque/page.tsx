import type { Metadata } from "next";
import { ErpPlaceholderTable } from "@/components/erp/erp-placeholder-table";
import { PageIntro } from "@/components/layout/page-intro";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Estoque — ERP",
};

export default function ErpEstoquePage() {
  return (
    <>
      <PageIntro
        title="Estoque"
        description="Locais de armazenamento, saldos por produto e histórico de movimentações."
        badge="Operação"
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <Button variant="primary" disabled>
          Nova movimentação
        </Button>
        <Button variant="secondary" disabled>
          Novo local
        </Button>
      </div>
      <Card className="mb-6">
        <h2 className="mb-4 font-serif text-lg font-bold text-marinha-900">Saldos</h2>
        <ErpPlaceholderTable
          columns={["Produto", "Local", "Quantidade"]}
        />
      </Card>
      <Card>
        <h2 className="mb-4 font-serif text-lg font-bold text-marinha-900">Movimentações</h2>
        <ErpPlaceholderTable
          columns={["Data", "Tipo", "Produto", "Qtd", "Referência"]}
        />
      </Card>
    </>
  );
}
