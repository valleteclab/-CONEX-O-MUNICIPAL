import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageIntro } from "@/components/layout/page-intro";

const modules = [
  {
    href: "/diretorio",
    title: "Diretório de negócios",
    desc: "Encontre empresas e MEIs do município, com filtros e avaliações.",
  },
  {
    href: "/cotacoes",
    title: "Central de cotações",
    desc: "Publique pedidos e compare propostas de fornecedores.",
  },
  {
    href: "/academia",
    title: "Academia",
    desc: "Cursos e trilhas para capacitar empreendedores e equipes.",
  },
  {
    href: "/erp",
    title: "ERP",
    desc: "Gestão de estoque, vendas e financeiro para o seu negócio.",
  },
  {
    href: "/painel",
    title: "Painel",
    desc: "Indicadores e ferramentas para gestores municipais.",
  },
] as const;

export default function HomePage() {
  return (
    <>
      <PageIntro
        title="Portal Conexão Municipal"
        description="Luís Eduardo Magalhães — negócios, capacitação e serviços ao cidadão. Escolha um módulo abaixo ou use o menu superior."
        badge="Protótipo de telas"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <Link key={m.href} href={m.href} className="group block focus-ring rounded-card">
            <Card className="h-full transition-shadow duration-200 group-hover:shadow-card-hover">
              <h2 className="font-serif text-xl text-marinha-900 group-hover:text-municipal-800">
                {m.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-marinha-500">{m.desc}</p>
              <p className="mt-4 text-sm font-semibold text-municipal-700">
                Abrir →
              </p>
            </Card>
          </Link>
        ))}
      </div>

      <Card variant="featured" className="mt-8">
        <p className="text-sm text-marinha-500">
          <strong className="text-marinha-900">Desenvolvimento:</strong> todas as telas
          seguem o mesmo guia visual (tipografia, cores e componentes).{" "}
          <Link
            href="/design-system"
            className="font-semibold text-municipal-700 underline-offset-2 hover:underline"
          >
            Ver guia visual
          </Link>
          {" · "}
          API{" "}
          <code className="rounded bg-marinha-900/5 px-1 font-mono text-marinha-900">
            /api/v1
          </code>
        </p>
      </Card>
    </>
  );
}
