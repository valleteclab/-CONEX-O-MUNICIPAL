import type { Metadata } from "next";
import Link from "next/link";
import { PlatformCourseLessonsManager } from "@/components/plataforma/platform-course-lessons-manager";
import { PageIntro } from "@/components/layout/page-intro";

export const metadata: Metadata = {
  title: "Aulas do curso — plataforma",
};

type Props = { params: { courseId: string } };

export default function PlatformCourseLessonsPage({ params }: Props) {
  return (
    <>
      <PageIntro
        title="Aulas do curso"
        description="Adicione vídeos do YouTube (URL), texto e ordem. O aluno vê o progresso e o certificado ao concluir todas as aulas."
        badge="Plataforma"
      />
      <p className="mb-6 text-sm text-marinha-600">
        <Link href="/dashboard/plataforma" className="font-medium text-municipal-700 hover:underline">
          ← Moderação
        </Link>
      </p>
      <PlatformCourseLessonsManager courseId={params.courseId} />
    </>
  );
}
