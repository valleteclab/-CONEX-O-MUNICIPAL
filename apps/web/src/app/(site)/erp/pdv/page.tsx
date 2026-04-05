import type { Metadata } from "next";
import { PdvPanel } from "@/components/erp/pdv-panel";
import { PageIntro } from "@/components/layout/page-intro";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "PDV — Ponto de venda",
};

export default function ErpPdvPage() {
  return (
    <>
      <PageIntro
        title="PDV — Ponto de venda"
        description="Código de barras (leitor ou digitar), catálogo e cupom compacto. Em telas largas o cupom evita rolagem com vários itens; no celular, rolagem só se a lista for longa."
        badge="Operação"
      />
      <Card className="mb-4 border-municipal-600/20 bg-municipal-600/5 p-4 sm:p-5">
        <p className="text-sm text-marinha-700">
          <strong className="text-marinha-900">Protótipo:</strong> dados em memória. Em produção, o PDV consome o mesmo{" "}
          <code className="rounded bg-white/80 px-1 font-mono text-marinha-900">business_id</code> do ERP e grava pedido de
          venda / NFC-e conforme regras fiscais.
        </p>
      </Card>
      <PdvPanel />
    </>
  );
}
