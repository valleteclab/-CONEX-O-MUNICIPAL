import type { Metadata } from "next";
import { ErpHomePanel } from "@/components/erp/erp-home-panel";
import { PageIntro } from "@/components/layout/page-intro";

export const metadata: Metadata = {
  title: "ERP — Área da empresa",
};

export default function ErpPage() {
  return (
    <>
      <PageIntro
        title="Painel do ERP"
        description="Acompanhe a operação da empresa e entre rápido nos módulos mais usados do dia a dia."
        badge="Área da empresa"
      />
      <ErpHomePanel />
    </>
  );
}
