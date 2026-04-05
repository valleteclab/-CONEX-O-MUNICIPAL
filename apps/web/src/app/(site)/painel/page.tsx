import type { Metadata } from "next";
import { PageIntro } from "@/components/layout/page-intro";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Painel municipal",
};

export default function PainelPage() {
  return (
    <>
      <PageIntro
        title="Painel"
        description="Visão para gestores: indicadores agregados, cadastros e relatórios. Conteúdo em evolução."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="space-y-3">
          <p className="text-xs font-semibold uppercase text-marinha-500">Carregando</p>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-full" />
        </Card>
        <Card className="space-y-3">
          <p className="text-xs font-semibold uppercase text-marinha-500">Carregando</p>
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-4 w-full" />
        </Card>
        <Card className="space-y-3">
          <p className="text-xs font-semibold uppercase text-marinha-500">Carregando</p>
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-full" />
        </Card>
      </div>
    </>
  );
}
