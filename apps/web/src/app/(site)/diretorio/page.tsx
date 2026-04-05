import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/layout/page-intro";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Diretório de negócios",
};

const exemplos = [
  { slug: "padaria-central", nome: "Padaria Central", cat: "Alimentação", nota: "4,8" },
  { slug: "eletrica-silva", nome: "Elétrica Silva", cat: "Serviços", nota: "4,5" },
  { slug: "tech-solucoes", nome: "Tech Soluções", cat: "Tecnologia", nota: "5,0" },
] as const;

export default function DiretorioPage() {
  return (
    <>
      <PageIntro
        title="Diretório de negócios"
        description="Explore empresas e MEIs cadastrados no município. Em breve: busca, filtros e mapa."
      />
      <div className="mb-6 flex flex-wrap gap-2">
        <Badge tone="neutral">Todos</Badge>
        <Badge tone="accent">Alimentação</Badge>
        <Badge tone="accent">Serviços</Badge>
        <Badge tone="accent">Comércio</Badge>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {exemplos.map((n) => (
          <li key={n.slug}>
            <Link href={`/diretorio/${n.slug}`} className="block focus-ring rounded-card">
              <Card className="h-full border-t-4 border-t-municipal-600 transition-shadow hover:shadow-card-hover">
                <p className="text-xs font-semibold uppercase text-marinha-500">{n.cat}</p>
                <h2 className="mt-1 font-serif text-xl text-marinha-900">{n.nome}</h2>
                <p className="mt-2 text-sm text-cerrado-600">★ {n.nota}</p>
                <p className="mt-3 text-sm font-semibold text-municipal-700">Ver perfil →</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
