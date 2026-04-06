import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AcademyLessonTracker } from "@/components/academia/academy-lesson-tracker";
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
  const trilhaLabel =
    lessons.length > 0 ?
      `${lessons.length} ${lessons.length === 1 ? "aula na trilha" : "aulas na trilha"}`
    : "Trilha";

  return (
    <>
      <PageIntro
        title={course.title}
        description={course.summary ?? "Formação da Academia Empresarial do município."}
        badge={course.category ? `${course.category} · ${trilhaLabel}` : trilhaLabel}
      />
      <p className="mb-6 text-sm text-marinha-600">
        <Link href="/academia" className="font-medium text-municipal-700 hover:underline">
          ← Voltar à Academia
        </Link>
      </p>

      {course.thumbnailUrl ? (
        <div className="relative mb-8 aspect-[21/9] w-full overflow-hidden rounded-card border border-marinha-900/8 shadow-card">
          <Image
            src={course.thumbnailUrl}
            alt=""
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        </div>
      ) : null}

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

      <AcademyLessonTracker courseId={course.id} slug={params.slug} initialLessons={lessons} />
    </>
  );
}
