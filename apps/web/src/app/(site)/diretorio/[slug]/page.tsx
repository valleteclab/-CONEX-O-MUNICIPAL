import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageIntro } from "@/components/layout/page-intro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const mock: Record<string, { nome: string; desc: string; cat: string }> = {
  "padaria-central": {
    nome: "Padaria Central",
    desc: "Pães artesanais e doces regionais. Atendimento de segunda a sábado.",
    cat: "Alimentação",
  },
  "eletrica-silva": {
    nome: "Elétrica Silva",
    desc: "Instalações e manutenção elétrica residencial e comercial.",
    cat: "Serviços",
  },
  "tech-solucoes": {
    nome: "Tech Soluções",
    desc: "Suporte em computadores, redes e pequenos sistemas.",
    cat: "Tecnologia",
  },
};

type Props = { params: { slug: string } };

export function generateMetadata({ params }: Props): Metadata {
  const data = mock[params.slug];
  return {
    title: data?.nome ?? "Negócio",
  };
}

export default function DiretorioNegocioPage({ params }: Props) {
  const data = mock[params.slug];
  if (!data) {
    notFound();
  }

  return (
    <>
      <PageIntro
        title={data.nome}
        description={data.desc}
        badge={data.cat}
      />
      <div className="flex flex-wrap gap-2">
        <Badge tone="success">Perfil exemplo</Badge>
        <Badge tone="neutral">Luís Eduardo Magalhães · BA</Badge>
      </div>
      <Card className="mt-6">
        <p className="text-sm text-marinha-500">
          Esta é uma tela de exemplo. Em produção: galeria, horários, serviços,
          avaliações e mapa conforme SDD §6.2.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="primary" disabled>
            Solicitar cotação (em breve)
          </Button>
          <Link
            href="/diretorio"
            className="focus-ring inline-flex min-h-[44px] items-center justify-center rounded-btn border-2 border-marinha-900/25 bg-white px-4 py-2.5 text-sm font-semibold text-marinha-900 transition hover:border-municipal-600/40 hover:bg-surface"
          >
            Voltar ao diretório
          </Link>
        </div>
      </Card>
    </>
  );
}
