import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageIntro } from "@/components/layout/page-intro";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <AppShell>
      <PageIntro
        title="Página não encontrada"
        description="O endereço pode ter sido digitado errado ou a página mudou de lugar."
      />
      <Card className="max-w-md">
        <p className="text-sm text-marinha-500">
          Volte ao início ou use o menu acima para navegar entre os módulos do portal.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="focus-ring inline-flex min-h-[44px] items-center justify-center rounded-btn bg-municipal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-municipal-700"
          >
            Ir ao início
          </Link>
        </div>
      </Card>
    </AppShell>
  );
}
