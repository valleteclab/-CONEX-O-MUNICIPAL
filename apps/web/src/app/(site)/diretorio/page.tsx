import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/layout/page-intro";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getPublicApiBaseUrl } from "@/lib/api-public";
import { apiGet, tenantQueryParam, type ApiListResponse } from "@/lib/api-server";
import type { DirectoryListingDto } from "@/types/directory";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Diretório de negócios",
};

function ctaVitrine(modo: "perfil" | "loja") {
  return modo === "loja" ? "Ver loja virtual →" : "Ver perfil →";
}

export default async function DiretorioPage() {
  const data = await apiGet<ApiListResponse<DirectoryListingDto>>(
    `/api/v1/businesses?${tenantQueryParam()}&take=100`,
    { revalidate: 30 },
  );

  if (!data) {
    const hasBase = !!getPublicApiBaseUrl();
    return (
      <>
        <PageIntro
          title="Diretório de negócios"
          description={
            hasBase
              ? "Não foi possível carregar a lista agora (tenant inexistente na API, erro 4xx/5xx ou rede)."
              : "Configure NEXT_PUBLIC_API_BASE_URL no serviço do Next (Railway)."
          }
        />
        <p className="text-sm text-marinha-500">
          {hasBase
            ? "Confirme DEFAULT_TENANT_SLUG / seed do Postgres em produção e se a URL da API está correta."
            : "Variável de ambiente em falta no build."}
        </p>
      </>
    );
  }

  const { items } = data;
  const categories = Array.from(
    new Set(items.map((i) => i.category).filter((c): c is string => Boolean(c?.trim()))),
  ).sort();

  return (
    <>
      <PageIntro
        title="Diretório de negócios"
        description="Cada cadastro pode publicar um perfil virtual ou uma loja virtual. Escolha um negócio para abrir a vitrine dele."
      />
      <div className="mb-6 flex flex-wrap gap-2">
        <Badge tone="neutral">Todos</Badge>
        {categories.map((c) => (
          <Badge key={c} tone="accent">
            {c}
          </Badge>
        ))}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-marinha-500">
          Nenhum negócio publicado. Cadastre-se como MEI/Empresa e crie a vitrine na API{" "}
          <code className="rounded bg-marinha-900/5 px-1 font-mono text-xs">POST /businesses</code>.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((n) => (
            <li key={n.id}>
              <Link href={`/diretorio/${n.slug}`} className="block focus-ring rounded-card">
                <Card className="h-full border-t-4 border-t-municipal-600 transition-shadow hover:shadow-card-hover">
                  <div className="flex flex-wrap items-center gap-2">
                    {n.category ? (
                      <p className="text-xs font-semibold uppercase text-marinha-500">{n.category}</p>
                    ) : null}
                    <Badge tone={n.modo === "loja" ? "success" : "neutral"} className="text-[10px] uppercase">
                      {n.modo === "loja" ? "Loja virtual" : "Perfil"}
                    </Badge>
                  </div>
                  <h2 className="mt-1 font-serif text-xl text-marinha-900">{n.tradeName}</h2>
                  {n.description ? (
                    <p className="mt-2 line-clamp-3 text-sm text-marinha-600">{n.description}</p>
                  ) : null}
                  <p className="mt-3 text-sm font-semibold text-municipal-700">{ctaVitrine(n.modo)}</p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
