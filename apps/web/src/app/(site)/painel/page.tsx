import type { Metadata } from "next";
import { PageIntro } from "@/components/layout/page-intro";
import { PainelDashboard } from "@/components/painel/painel-dashboard";

export const metadata: Metadata = {
  title: "Painel municipal",
};

export default function PainelPage() {
  return (
    <>
      <PageIntro
        title="Painel"
        description="Indicadores agregados do município (tenant ativo na sessão). Requer papel de gestor ou administrador — SDD §6.5."
      />
      <PainelDashboard />
    </>
  );
}
