import type { Metadata } from "next";
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
        description="Inclui pedidos criados no ERP e solicitações vindas do diretório (orçamento ou compra na vitrine), com origem identificável."
        badge="Vendas"
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <Button variant="primary" disabled>
          Novo pedido
        </Button>
      </div>
      <Card>
        <ErpPlaceholderTable
          columns={["Nº", "Origem", "Cliente", "Data", "Status", "Total"]}
        />
      </Card>
    </>
  );
}
