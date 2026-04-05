import type { Metadata } from "next";
import Link from "next/link";
import { AcademyMyCoursesList } from "@/components/academia/academy-my-courses-list";
import { PageIntro } from "@/components/layout/page-intro";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Minhas formações",
};

export default function DashboardAcademiaPage() {
  return (
    <>
      <PageIntro
        title="Minhas formações"
        description="Cursos em que se matriculou no município (tenant ativo na sessão)."
        badge="Dashboard"
      />
      <p className="mb-4 text-sm text-marinha-600">
        <Link href="/academia" className="font-medium text-municipal-700 hover:underline">
          ← Catálogo da Academia
        </Link>
      </p>
      <Card className="p-5">
        <h2 className="font-serif text-lg text-marinha-900">Progresso</h2>
        <div className="mt-4">
          <AcademyMyCoursesList />
        </div>
      </Card>
    </>
  );
}
