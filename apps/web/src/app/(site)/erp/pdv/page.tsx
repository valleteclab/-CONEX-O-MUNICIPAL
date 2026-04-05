import type { Metadata } from "next";
import { PdvPanel } from "@/components/erp/pdv-panel";
import { PageIntro } from "@/components/layout/page-intro";

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
      <PdvPanel />
    </>
  );
}
