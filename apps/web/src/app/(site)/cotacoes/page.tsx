import type { Metadata } from "next";
import { PageIntro } from "@/components/layout/page-intro";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Central de cotações",
};

export default function CotacoesPage() {
  return (
    <>
      <PageIntro
        title="Central de cotações"
        description="Publique o que precisa comprar ou contratar e receba propostas de fornecedores do município. Módulo em implementação conforme SDD §6.3."
      />
      <Card>
        <ul className="list-inside list-disc space-y-2 text-sm text-marinha-600">
          <li>Criação de solicitação com especificações</li>
          <li>Comparativo de propostas e chat com fornecedores</li>
          <li>Histórico e status (aberta, em análise, fechada)</li>
        </ul>
      </Card>
    </>
  );
}
