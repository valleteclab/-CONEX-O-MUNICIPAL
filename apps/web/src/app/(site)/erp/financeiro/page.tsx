import type { Metadata } from "next";
import { ErpPlaceholderTable } from "@/components/erp/erp-placeholder-table";
import { PageIntro } from "@/components/layout/page-intro";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Financeiro — ERP",
};

export default function ErpFinanceiroPage() {
  return (
    <>
      <PageIntro
        title="Financeiro"
        description="Contas a receber, a pagar e lançamentos de caixa (visão simplificada Onda A)."
        badge="Financeiro"
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <Button variant="primary" disabled>
          Novo a receber
        </Button>
        <Button variant="secondary" disabled>
          Novo a pagar
        </Button>
        <Button variant="secondary" disabled>
          Lançamento de caixa
        </Button>
      </div>
      <Card className="mb-6">
        <h2 className="mb-4 font-serif text-lg font-bold text-marinha-900">Contas a receber</h2>
        <ErpPlaceholderTable
          columns={["Cliente", "Vencimento", "Valor", "Status"]}
        />
      </Card>
      <Card className="mb-6">
        <h2 className="mb-4 font-serif text-lg font-bold text-marinha-900">Contas a pagar</h2>
        <ErpPlaceholderTable
          columns={["Fornecedor", "Vencimento", "Valor", "Status"]}
        />
      </Card>
      <Card>
        <h2 className="mb-4 font-serif text-lg font-bold text-marinha-900">Fluxo de caixa</h2>
        <ErpPlaceholderTable
          columns={["Data", "Tipo", "Categoria", "Valor"]}
        />
      </Card>
    </>
  );
}
