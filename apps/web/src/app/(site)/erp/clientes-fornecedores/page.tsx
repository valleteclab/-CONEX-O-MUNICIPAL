import type { Metadata } from "next";
import { ErpPlaceholderTable } from "@/components/erp/erp-placeholder-table";
import { PageIntro } from "@/components/layout/page-intro";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Clientes e fornecedores — ERP",
};

export default function ErpPartiesPage() {
  return (
    <>
      <PageIntro
        title="Clientes e fornecedores"
        description="Pessoas físicas e jurídicas vinculadas ao seu negócio para pedidos e financeiro."
        badge="Cadastros"
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <Button variant="primary" disabled>
          Novo cadastro
        </Button>
      </div>
      <Card>
        <ErpPlaceholderTable
          columns={["Tipo", "Nome", "Documento", "Cidade/UF"]}
        />
      </Card>
    </>
  );
}
