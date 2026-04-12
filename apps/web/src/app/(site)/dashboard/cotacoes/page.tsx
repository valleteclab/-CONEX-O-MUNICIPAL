import type { Metadata } from "next";
import Link from "next/link";
import { QuotationMineList } from "@/components/cotacoes/quotation-mine-list";
import { PageIntro } from "@/components/layout/page-intro";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Minhas oportunidades",
};

export default function DashboardCotacoesPage() {
  return (
    <>
      <PageIntro
        title="Minhas oportunidades"
        description="Demandas que você publicou neste município, com acompanhamento de respostas recebidas."
        badge="Dashboard"
      />
      <p className="mb-4 text-sm text-marinha-600">
        <Link href="/oportunidades" className="font-medium text-municipal-700 hover:underline">
          ← Voltar à central de oportunidades
        </Link>
      </p>
      <Card className="p-5">
        <h2 className="font-serif text-lg text-marinha-900">O que você publicou</h2>
        <div className="mt-4">
          <QuotationMineList />
        </div>
      </Card>
    </>
  );
}
