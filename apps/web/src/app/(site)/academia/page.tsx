import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/layout/page-intro";
import { Card } from "@/components/ui/card";
import { apiGet, tenantQueryParam, type ApiListResponse } from "@/lib/api-server";
import type { AcademyCourseDto } from "@/types/academy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Academia",
};

type FeaturedResponse = { items: AcademyCourseDto[] };

export default async function AcademiaPage() {
  const tenantQ = tenantQueryParam();
  const [featured, data] = await Promise.all([
    apiGet<FeaturedResponse>(`/api/v1/academy/courses/featured?${tenantQ}&take=6`, { revalidate: 30 }),
    apiGet<ApiListResponse<AcademyCourseDto>>(`/api/v1/academy/courses?${tenantQ}&take=100`, {
      revalidate: 30,
    }),
  ]);

  return (
    <>
      <PageIntro
        title="Academia"
        description="Trilhas e cursos para empreendedores — catálogo público; com conta, matrícula e acompanhamento do progresso."
      />
      <p className="-mt-2 mb-6 text-sm text-marinha-600">
        <Link
          href="/dashboard/academia"
          className="font-medium text-municipal-700 underline-offset-2 hover:underline"
        >
          Área logada: minhas formações
        </Link>
      </p>

      {featured?.items?.length ? (
        <section className="mb-10">
          <h2 className="font-serif text-xl text-marinha-900">Em destaque</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {featured.items.map((c) => (
              <Link key={c.id} href={`/academia/${c.slug}`} className="block">
                <Card variant="featured">
                  <p className="text-xs font-semibold uppercase tracking-wide text-municipal-700">
                    Destaque
                  </p>
                  <h3 className="mt-2 font-serif text-lg text-marinha-900">{c.title}</h3>
                  {c.summary ? <p className="mt-2 text-sm text-marinha-600">{c.summary}</p> : null}
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="font-serif text-xl text-marinha-900">Todos os cursos</h2>
        {!data ? (
          <p className="mt-3 text-sm text-marinha-500">
            Não foi possível carregar os cursos (verifique NEXT_PUBLIC_API_BASE_URL).
          </p>
        ) : data.items.length === 0 ? (
          <Card className="mt-4">
            <p className="text-sm text-marinha-500">Nenhum curso publicado ainda.</p>
          </Card>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {data.items.map((c) => (
              <Link key={c.id} href={`/academia/${c.slug}`} className="block">
                <Card variant={c.id === data.items[0]?.id ? "featured" : "default"}>
                  <h3 className="font-serif text-lg text-marinha-900">{c.title}</h3>
                  {c.summary ? <p className="mt-2 text-sm text-marinha-600">{c.summary}</p> : null}
                  {c.category ? (
                    <p className="mt-2 text-xs font-medium text-marinha-500">{c.category}</p>
                  ) : null}
                  {c.durationMinutes != null ? (
                    <p className="mt-3 text-xs font-medium text-marinha-500">
                      Carga horária estimada: {c.durationMinutes} min
                    </p>
                  ) : null}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
