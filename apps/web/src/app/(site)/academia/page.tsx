import type { Metadata } from "next";
import { PageIntro } from "@/components/layout/page-intro";
import { Card } from "@/components/ui/card";
import { apiGet, tenantQueryParam, type ApiListResponse } from "@/lib/api-server";
import type { AcademyCourseDto } from "@/types/academy";

export const metadata: Metadata = {
  title: "Academia",
};

export default async function AcademiaPage() {
  const data = await apiGet<ApiListResponse<AcademyCourseDto>>(
    `/api/v1/academy/courses?${tenantQueryParam()}&take=100`,
    { revalidate: 30 },
  );

  return (
    <>
      <PageIntro
        title="Academia"
        description="Trilhas e cursos para empreendedores — conteúdo servido pela API do município."
      />
      {!data ? (
        <p className="text-sm text-marinha-500">Não foi possível carregar os cursos (verifique NEXT_PUBLIC_API_BASE_URL).</p>
      ) : data.items.length === 0 ? (
        <Card>
          <p className="text-sm text-marinha-500">Nenhum curso publicado ainda.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.items.map((c) => (
            <Card key={c.id} variant={c.id === data.items[0]?.id ? "featured" : "default"}>
              <h2 className="font-serif text-lg text-marinha-900">{c.title}</h2>
              {c.summary ? <p className="mt-2 text-sm text-marinha-600">{c.summary}</p> : null}
              {c.durationMinutes != null ? (
                <p className="mt-3 text-xs font-medium text-marinha-500">
                  Carga horária estimada: {c.durationMinutes} min
                </p>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
