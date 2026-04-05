import type { Metadata } from "next";
import { ErpApiHint } from "@/components/erp/erp-api-hint";
import { ErpPlaceholderTable } from "@/components/erp/erp-placeholder-table";
import { PageIntro } from "@/components/layout/page-intro";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Pedidos de compra — ERP",
};

export default function ErpPedidosCompraPage() {
  return (
    <>
      <PageIntro
        title="Pedidos de compra"
        description="Pedidos a fornecedores com itens e acompanhamento de status."
        badge="Compras"
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <Button variant="primary" disabled>
          Novo pedido de compra
        </Button>
      </div>
      <Card>
        <ErpPlaceholderTable
          columns={["Nº", "Fornecedor", "Data", "Status", "Total"]}
        />
        <ErpApiHint path="/api/v1/erp/purchase-orders" />
      </Card>
    </>
  );
}
