import type { Metadata } from "next";
import Link from "next/link";
import { AcademyCatalogWithProgress } from "@/components/academia/academy-catalog-with-progress";
import { AcademyCategoryFilters } from "@/components/academia/academy-category-filters";
import { PageIntro } from "@/components/layout/page-intro";
import { Card } from "@/components/ui/card";
import { ACADEMY_COURSE_CATEGORIES } from "@/lib/academy-categories";
import { apiGet, tenantQueryParam, type ApiListResponse } from "@/lib/api-server";
import type { AcademyCourseDto } from "@/types/academy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Academia",
};

type FeaturedResponse = { items: AcademyCourseDto[] };
type CategoriesResponse = { items: string[] };

type PageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function AcademiaPage({ searchParams }: PageProps) {
  const tenantQ = tenantQueryParam();
  const categoriaRaw = searchParams.categoria;
  const categoryFilter =
    typeof categoriaRaw === "string" && categoriaRaw.trim() ? categoriaRaw.trim() : "";

  const listPath =
    categoryFilter
      ? `/api/v1/academy/courses?${tenantQ}&take=100&category=${encodeURIComponent(categoryFilter)}`
      : `/api/v1/academy/courses?${tenantQ}&take=100`;

  const [featured, data, categoriesRes] = await Promise.all([
    apiGet<FeaturedResponse>(`/api/v1/academy/courses/featured?${tenantQ}&take=6`, {
      revalidate: 30,
    }),
    apiGet<ApiListResponse<AcademyCourseDto>>(listPath, { revalidate: 30 }),
    apiGet<CategoriesResponse>(`/api/v1/academy/courses/categories?${tenantQ}`, { revalidate: 60 }),
  ]);

  const categories = Array.from(
    new Set([...ACADEMY_COURSE_CATEGORIES, ...(categoriesRes?.items ?? [])]),
  ).sort((a, b) => a.localeCompare(b, "pt"));

  return (
    <>
      <PageIntro
        title="Academia"
        description="Trilhas de formação para empreendedores, com categorias, conteúdos em destaque e progresso para quem já está matriculado."
      />
      <p className="-mt-2 mb-6 flex flex-wrap gap-x-4 gap-y-1 text-sm text-marinha-600">
        <Link
          href="/dashboard/academia"
          className="font-medium text-municipal-700 underline-offset-2 hover:underline"
        >
          Área logada: minhas formações
        </Link>
        <Link
          href="/academia/ao-vivo"
          className="font-medium text-municipal-700 underline-offset-2 hover:underline"
        >
          Aulas ao vivo
        </Link>
      </p>

      <AcademyCategoryFilters categories={categories} active={categoryFilter} />

      {featured?.items?.length ? (
        <section className="mb-12">
          <h2 className="font-serif text-xl text-marinha-900">Em destaque</h2>
          <p className="mt-1 text-sm text-marinha-500">
            Trilhas escolhidas pela equipe do município para facilitar o começo de quem quer aprender, se organizar e
            acompanhar a própria evolução.
          </p>
          <div className="mt-5">
            <AcademyCatalogWithProgress courses={featured.items} variant="featured" />
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="font-serif text-xl text-marinha-900">
          {categoryFilter ? `Trilhas — ${categoryFilter}` : "Todas as trilhas"}
        </h2>
        <p className="mt-1 text-sm text-marinha-500">
          {categoryFilter
            ? `Mostrando apenas cursos da categoria “${categoryFilter}”. `
            : "Filtre por categoria acima para encontrar o conteúdo mais relevante para você. "}
          O progresso aparece nos cartões depois de entrar na conta e se matricular.
        </p>
        {!data ? (
          <p className="mt-3 text-sm text-marinha-500">
            Não foi possível carregar os cursos no momento.
          </p>
        ) : data.items.length === 0 ? (
          <Card className="mt-4">
            <p className="text-sm text-marinha-500">
              {categoryFilter
                ? "Nenhum curso encontrado nesta categoria. Escolha “Todas” ou tente outra opção."
                : "Nenhum curso publicado ainda."}
            </p>
          </Card>
        ) : (
          <div className="mt-5">
            <AcademyCatalogWithProgress courses={data.items} variant="default" />
          </div>
        )}
      </section>
    </>
  );
}
