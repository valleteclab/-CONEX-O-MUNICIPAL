import type { Metadata } from "next";
import { ErpApiHint } from "@/components/erp/erp-api-hint";
import { ErpPlaceholderTable } from "@/components/erp/erp-placeholder-table";
import { PageIntro } from "@/components/layout/page-intro";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Pedidos de venda — ERP",
};

export default function ErpPedidosVendaPage() {
  return (
    <>
      <PageIntro
        title="Pedidos de venda"
        description="Pedidos com cliente, itens, totais e status (Onda A)."
        badge="Vendas"
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <Button variant="primary" disabled>
          Novo pedido
        </Button>
      </div>
      <Card>
        <ErpPlaceholderTable
          columns={["Nº", "Cliente", "Data", "Status", "Total"]}
        />
        <ErpApiHint path="/api/v1/erp/sales-orders" />
      </Card>
    </>
  );
}
