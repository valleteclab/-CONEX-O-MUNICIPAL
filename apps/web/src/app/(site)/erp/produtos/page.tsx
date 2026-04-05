import type { Metadata } from "next";
import { ErpPlaceholderTable } from "@/components/erp/erp-placeholder-table";
import { PageIntro } from "@/components/layout/page-intro";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Produtos — ERP",
};

export default function ErpProdutosPage() {
  return (
    <>
      <PageIntro
        title="Produtos"
        description="Cadastro de itens para venda ou consumo interno, com SKU, NCM e controle de preço."
        badge="Cadastros"
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <Button variant="primary" disabled>
          Novo produto
        </Button>
      </div>
      <Card>
        <ErpPlaceholderTable
          columns={["SKU", "Nome", "Unidade", "Preço", "Estoque mín."]}
        />
      </Card>
    </>
  );
}
