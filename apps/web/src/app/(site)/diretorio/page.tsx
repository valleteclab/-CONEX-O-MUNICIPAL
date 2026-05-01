import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/layout/page-intro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getPublicApiBaseUrl } from "@/lib/api-public";
import { apiGet, tenantQueryParam, type ApiListResponse } from "@/lib/api-server";
import type { DirectoryListingDto } from "@/types/directory";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Negócios locais",
};

function ctaVitrine(modo: "perfil" | "loja") {
  return modo === "loja" ? "Ver loja e catálogo →" : "Ver perfil →";
}

function buildQuery(base: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(base)) {
    if (value?.trim()) {
      params.set(key, value);
    }
  }
  return params.toString();
}

type DiretorioPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function DiretorioPage({ searchParams }: DiretorioPageProps) {
  const q = typeof searchParams?.q === "string" ? searchParams.q : "";
  const category = typeof searchParams?.category === "string" ? searchParams.category : "";
  const modo =
    searchParams?.modo === "perfil" || searchParams?.modo === "loja" ? searchParams.modo : "";
  const sort = searchParams?.sort === "recent" ? "recent" : "name";

  const baseTenant = tenantQueryParam();
  const listingQuery = buildQuery({
    tenant: baseTenant.split("=")[1],
    q,
    category,
    modo,
    sort,
    take: "100",
  });

  const data = await apiGet<ApiListResponse<DirectoryListingDto>>(`/api/v1/businesses?${listingQuery}`, {
    revalidate: 30,
  });
  const [categories, featured] = await Promise.all([
    apiGet<string[]>(`/api/v1/businesses/categories?${baseTenant}`, { revalidate: 60 }),
    apiGet<DirectoryListingDto[]>(`/api/v1/businesses/featured?${baseTenant}&take=3`, {
      revalidate: 60,
    }),
  ]);

  if (!data) {
    const hasBase = !!getPublicApiBaseUrl();
    return (
      <>
        <PageIntro
          title="Negócios locais"
          description={
            hasBase
              ? "Não foi possível carregar a lista agora."
              : "A conexão do sistema ainda não está configurada para este ambiente."
          }
        />
        <p className="text-sm text-marinha-500">
          {hasBase ? "Tente novamente em instantes." : "Avise a equipe responsável para concluir a configuração."}
        </p>
      </>
    );
  }

  const { items } = data;
  const activeCategory = category.trim();
  const activeModo = modo.trim();

  return (
    <>
      <PageIntro
        title="Negócios locais"
        description="Descubra prestadores, fornecedores e vitrines comerciais do município. Diretório, catálogo e presença digital convivendo na mesma plataforma."
      />
      <Card className="mb-6">
        <form className="grid gap-4 md:grid-cols-4" action="/diretorio">
          <div className="md:col-span-2">
            <label htmlFor="q" className="mb-1 block text-sm font-medium text-marinha-700">
              Buscar negócio
            </label>
            <Input id="q" name="q" defaultValue={q} placeholder="Ex.: padaria, eletricista, manutenção" />
          </div>
          <div>
            <label htmlFor="modo" className="mb-1 block text-sm font-medium text-marinha-700">
              Tipo
            </label>
            <select
              id="modo"
              name="modo"
              defaultValue={activeModo}
              className="focus-ring min-h-[44px] w-full rounded-btn border-2 border-marinha-900/25 bg-white px-3 py-2 text-sm text-marinha-900"
            >
              <option value="">Todos</option>
              <option value="perfil">Serviços</option>
              <option value="loja">Loja / catálogo</option>
            </select>
          </div>
          <div>
            <label htmlFor="sort" className="mb-1 block text-sm font-medium text-marinha-700">
              Ordenação
            </label>
            <select
              id="sort"
              name="sort"
              defaultValue={sort}
              className="focus-ring min-h-[44px] w-full rounded-btn border-2 border-marinha-900/25 bg-white px-3 py-2 text-sm text-marinha-900"
            >
              <option value="name">Nome</option>
              <option value="recent">Mais recentes</option>
            </select>
          </div>
          <input type="hidden" name="category" value={activeCategory} />
          <div className="md:col-span-4 flex flex-wrap gap-3">
            <Button type="submit">Aplicar filtros</Button>
            <Link
              href="/diretorio"
              className="focus-ring inline-flex min-h-[44px] items-center justify-center rounded-btn border-2 border-marinha-900/25 bg-white px-4 py-2.5 text-sm font-semibold text-marinha-900 transition hover:border-municipal-600/40 hover:bg-surface"
            >
              Limpar
            </Link>
            <Link
              href="/marketplace"
              className="focus-ring inline-flex min-h-[44px] items-center justify-center rounded-btn border-2 border-municipal-600/40 bg-municipal-600/5 px-4 py-2.5 text-sm font-semibold text-municipal-800 transition hover:bg-municipal-600/10"
            >
              Ir para o marketplace
            </Link>
          </div>
        </form>
      </Card>

      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="/diretorio">
          <Badge tone={activeCategory ? "neutral" : "accent"}>Todos</Badge>
        </Link>
        {(categories ?? []).map((c) => {
          const params = buildQuery({ q, modo: activeModo, sort, category: c });
          return (
            <Link key={c} href={`/diretorio?${params}`}>
              <Badge tone={activeCategory === c ? "accent" : "neutral"}>{c}</Badge>
            </Link>
          );
        })}
      </div>

      {featured && featured.length > 0 ? (
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-serif text-xl text-marinha-900">Negócios em destaque</h2>
            <p className="text-sm text-marinha-500">Presenças comerciais publicadas recentemente</p>
          </div>
          <ul className="grid gap-4 md:grid-cols-3">
            {featured.map((n) => (
              <li key={n.id}>
                <Link href={`/diretorio/${n.slug}`} className="block focus-ring rounded-card">
                  <Card className="h-full border border-municipal-600/20 bg-municipal-600/5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="accent">Destaque</Badge>
                      <Badge tone={n.modo === "loja" ? "success" : "neutral"} className="text-[10px] uppercase">
                        {n.modo === "loja" ? "Loja" : "Serviços"}
                      </Badge>
                    </div>
                    <h3 className="mt-2 font-serif text-lg text-marinha-900">{n.tradeName}</h3>
                    {n.publicHeadline ? <p className="mt-2 text-sm text-marinha-700">{n.publicHeadline}</p> : null}
                    {n.description ? <p className="mt-2 line-clamp-2 text-sm text-marinha-600">{n.description}</p> : null}
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {items.length === 0 ? (
        <p className="text-sm text-marinha-500">
          Nenhum negócio publicado ainda. Cadastre-se como MEI ou Empresa e monte seu perfil em{" "}
          <Link href="/dashboard/meu-negocio" className="font-medium text-municipal-700 underline-offset-2 hover:underline">
            presença digital
          </Link>
          .
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((n) => (
            <li key={n.id}>
              <Link href={`/diretorio/${n.slug}`} className="block focus-ring rounded-card">
                <Card className="h-full border-t-4 border-t-municipal-600 transition-shadow hover:shadow-card-hover">
                  <div className="flex flex-wrap items-center gap-2">
                    {n.category ? <p className="text-xs font-semibold uppercase text-marinha-500">{n.category}</p> : null}
                    <Badge tone={n.modo === "loja" ? "success" : "neutral"} className="text-[10px] uppercase">
                      {n.modo === "loja" ? "Loja / catálogo" : "Serviços"}
                    </Badge>
                  </div>
                  <h2 className="mt-1 font-serif text-xl text-marinha-900">{n.tradeName}</h2>
                  {n.publicHeadline ? <p className="mt-2 text-sm font-medium text-marinha-700">{n.publicHeadline}</p> : null}
                  {n.description ? <p className="mt-2 line-clamp-3 text-sm text-marinha-600">{n.description}</p> : null}
                  {n.services.length > 0 ? <p className="mt-2 text-xs text-marinha-500">{n.services.slice(0, 2).join(" · ")}</p> : null}
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
