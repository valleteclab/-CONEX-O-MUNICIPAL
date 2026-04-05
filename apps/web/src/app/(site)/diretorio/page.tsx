import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/layout/page-intro";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DIRETORIO_NEGOCIOS } from "@/data/diretorio-negocios";

export const metadata: Metadata = {
  title: "Diretório de negócios",
};

function ctaVitrine(modo: "perfil" | "loja") {
  return modo === "loja" ? "Ver loja virtual →" : "Ver perfil →";
}

export default function DiretorioPage() {
  return (
    <>
      <PageIntro
        title="Diretório de negócios"
        description="Cada cadastro pode publicar um perfil virtual ou uma loja virtual. Escolha um negócio para abrir a vitrine dele."
      />
      <div className="mb-6 flex flex-wrap gap-2">
        <Badge tone="neutral">Todos</Badge>
        <Badge tone="accent">Alimentação</Badge>
        <Badge tone="accent">Serviços</Badge>
        <Badge tone="accent">Comércio</Badge>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DIRETORIO_NEGOCIOS.map((n) => (
          <li key={n.slug}>
            <Link href={`/diretorio/${n.slug}`} className="block focus-ring rounded-card">
              <Card className="h-full border-t-4 border-t-municipal-600 transition-shadow hover:shadow-card-hover">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase text-marinha-500">{n.cat}</p>
                  <Badge tone={n.modo === "loja" ? "success" : "neutral"} className="text-[10px] uppercase">
                    {n.modo === "loja" ? "Loja virtual" : "Perfil"}
                  </Badge>
                </div>
                <h2 className="mt-1 font-serif text-xl text-marinha-900">{n.nome}</h2>
                <p className="mt-2 text-sm text-cerrado-600">★ {n.nota}</p>
                <p className="mt-3 text-sm font-semibold text-municipal-700">{ctaVitrine(n.modo)}</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
