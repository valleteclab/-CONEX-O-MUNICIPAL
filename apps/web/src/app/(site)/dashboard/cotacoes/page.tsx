import type { Metadata } from "next";
import Link from "next/link";
import { QuotationMineList } from "@/components/cotacoes/quotation-mine-list";
import { PageIntro } from "@/components/layout/page-intro";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Minhas cotações",
};

export default function DashboardCotacoesPage() {
  return (
    <>
      <PageIntro
        title="Minhas cotações"
        description="Solicitações que publicou neste município (tenant ativo na sessão)."
        badge="Dashboard"
      />
      <p className="mb-4 text-sm text-marinha-600">
        <Link href="/cotacoes" className="font-medium text-municipal-700 hover:underline">
          ← Voltar à central de cotações
        </Link>
      </p>
      <Card className="p-5">
        <h2 className="font-serif text-lg text-marinha-900">As suas solicitações</h2>
        <div className="mt-4">
          <QuotationMineList />
        </div>
      </Card>
    </>
  );
}
