import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageIntro } from "@/components/layout/page-intro";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <AppShell>
      <PageIntro
        title="Pagina nao encontrada"
        description="O endereco pode ter sido digitado errado ou a pagina mudou de lugar."
      />
      <Card className="w-full">
        <p className="text-sm text-marinha-500">
          Volte ao inicio ou use a navegacao principal para encontrar negocios, oportunidades, academia e acessos.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="focus-ring inline-flex min-h-[44px] items-center justify-center rounded-btn bg-municipal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-municipal-700"
          >
            Ir ao inicio
          </Link>
        </div>
      </Card>
    </AppShell>
  );
}
