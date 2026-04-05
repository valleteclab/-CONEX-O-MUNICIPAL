import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageIntro } from "@/components/layout/page-intro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiGet, tenantQueryParam } from "@/lib/api-server";
import type { DirectoryListingDto } from "@/types/directory";

type Props = { params: { slug: string } };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const row = await apiGet<DirectoryListingDto>(
    `/api/v1/businesses/${encodeURIComponent(params.slug)}?${tenantQueryParam()}`,
    { revalidate: 60 },
  );
  const suffix = row?.modo === "loja" ? " — Loja virtual" : " — Perfil";
  return {
    title: row ? `${row.tradeName}${suffix}` : "Negócio",
  };
}

export default async function DiretorioNegocioPage({ params }: Props) {
  const data = await apiGet<DirectoryListingDto>(
    `/api/v1/businesses/${encodeURIComponent(params.slug)}?${tenantQueryParam()}`,
    { revalidate: 30 },
  );

  if (!data) {
    notFound();
  }

  const isLoja = data.modo === "loja";

  return (
    <>
      <PageIntro
        title={data.tradeName}
        description={data.description || "Sem descrição cadastrada."}
        badge={isLoja ? "Loja virtual" : "Perfil virtual"}
      >
        <div className="mt-3 flex flex-wrap gap-2">
          {data.category ? <Badge tone="neutral">{data.category}</Badge> : null}
          <Badge tone="success">Luís Eduardo Magalhães · BA</Badge>
        </div>
      </PageIntro>

      {isLoja ? (
        <Card className="mb-6">
          <h2 className="font-serif text-lg font-bold text-marinha-900">Vitrine / catálogo</h2>
          <p className="mt-2 text-sm text-marinha-500">
            O catálogo de produtos e preços será carregado a partir do ERP quando a integração estiver ativa
            (SDD §6.2 / §6.7).
          </p>
        </Card>
      ) : (
        <Card className="mb-6">
          <h2 className="font-serif text-lg font-bold text-marinha-900">Sobre o negócio</h2>
          <p className="mt-2 text-sm text-marinha-500">
            Perfil público para divulgar serviços e contato. Galeria, avaliações e mapa conforme evolução do SDD
            §6.2.
          </p>
        </Card>
      )}

      <Card>
        <p className="text-sm text-marinha-600">
          <strong className="text-marinha-900">ERP:</strong> orçamentos e pedidos feitos nesta vitrine entram no
          módulo <strong>Pedidos de venda</strong> do ERP do negócio (origem portal), quando o fluxo estiver
          ligado.
        </p>
        <p className="mt-3 text-sm text-marinha-500">
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
