import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseActions } from "@/components/academia/course-actions";
import { PageIntro } from "@/components/layout/page-intro";
import { Card } from "@/components/ui/card";
import { apiGet, tenantQueryParam } from "@/lib/api-server";
import type { AcademyCourseDetailResponse } from "@/types/academy";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await apiGet<AcademyCourseDetailResponse>(
    `/api/v1/academy/courses/${encodeURIComponent(params.slug)}?${tenantQueryParam()}`,
    { revalidate: 60 },
  );
  if (!data) {
    return { title: "Curso" };
  }
  return { title: data.course.title };
}

export default async function AcademiaCursoPage({ params }: Props) {
  const data = await apiGet<AcademyCourseDetailResponse>(
    `/api/v1/academy/courses/${encodeURIComponent(params.slug)}?${tenantQueryParam()}`,
    { revalidate: 30 },
  );

  if (!data) {
    notFound();
  }

  const { course, lessons } = data;

  return (
    <>
      <PageIntro
        title={course.title}
        description={course.summary ?? "Formação da Academia Empresarial do município."}
        badge={course.category ?? "Curso"}
      />
      <p className="mb-6 text-sm text-marinha-600">
        <Link href="/academia" className="font-medium text-municipal-700 hover:underline">
          ← Voltar à Academia
        </Link>
      </p>

      <Card className="mb-8 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            {course.durationMinutes != null ? (
              <p className="text-sm text-marinha-500">
                Carga horária estimada: {course.durationMinutes} min (catálogo)
              </p>
            ) : null}
            {course.isFeatured ? (
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-municipal-700">
                Em destaque
              </p>
            ) : null}
          </div>
          <CourseActions courseId={course.id} />
        </div>
      </Card>

      <section>
        <h2 className="font-serif text-lg text-marinha-900">Aulas</h2>
        <ul className="mt-4 space-y-4">
          {lessons.map((lesson, idx) => (
            <li key={lesson.id}>
              <Card className="p-4">
                <p className="text-xs font-medium text-marinha-500">
                  Aula {idx + 1}
                  {lesson.durationMinutes != null ? ` · ~${lesson.durationMinutes} min` : null}
                </p>
                <h3 className="mt-1 font-semibold text-marinha-900">{lesson.title}</h3>
                {lesson.contentMd ? (
                  <div className="mt-2 whitespace-pre-wrap text-sm text-marinha-600">{lesson.contentMd}</div>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
