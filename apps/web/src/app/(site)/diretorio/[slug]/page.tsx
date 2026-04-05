import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageIntro } from "@/components/layout/page-intro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getNegocioDiretorio, listSlugsDiretorio } from "@/data/diretorio-negocios";

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return listSlugsDiretorio().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const data = getNegocioDiretorio(params.slug);
  const suffix = data?.modo === "loja" ? " — Loja virtual" : " — Perfil";
  return {
    title: data ? `${data.nome}${suffix}` : "Negócio",
  };
}

export default function DiretorioNegocioPage({ params }: Props) {
  const data = getNegocioDiretorio(params.slug);
  if (!data) {
    notFound();
  }

  const isLoja = data.modo === "loja";

  return (
    <>
      <PageIntro
        title={data.nome}
        description={data.desc}
        badge={isLoja ? "Loja virtual" : "Perfil virtual"}
      >
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="neutral">{data.cat}</Badge>
          <Badge tone="success">Luís Eduardo Magalhães · BA</Badge>
        </div>
      </PageIntro>

      {isLoja ? (
        <Card className="mb-6">
          <h2 className="font-serif text-lg font-bold text-marinha-900">Vitrine / catálogo</h2>
          <p className="mt-2 text-sm text-marinha-500">
            Em produção: produtos, preços e disponibilidade para pedido online conforme o SDD.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {["Item exemplo A", "Item exemplo B", "Item exemplo C"].map((item) => (
              <li
                key={item}
                className="rounded-btn border border-marinha-900/10 bg-surface p-4 text-sm font-medium text-marinha-800"
              >
                {item}
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card className="mb-6">
          <h2 className="font-serif text-lg font-bold text-marinha-900">Sobre o negócio</h2>
          <p className="mt-2 text-sm text-marinha-500">
            Perfil público para divulgar serviços, horários e contato. Em produção: galeria, avaliações e mapa
            conforme SDD §6.2.
          </p>
        </Card>
      )}

      <Card>
        <p className="text-sm text-marinha-500">
          URL pública da vitrine:{" "}
          <code className="rounded bg-marinha-900/5 px-1 font-mono text-marinha-900">
            /diretorio/{data.slug}
          </code>
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="primary" disabled>
            {isLoja ? "Comprar / pedir (em breve)" : "Solicitar cotação (em breve)"}
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
