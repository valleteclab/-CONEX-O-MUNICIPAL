import type { Metadata } from "next";
import { PageIntro } from "@/components/layout/page-intro";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Academia",
};

export default function AcademiaPage() {
  return (
    <>
      <PageIntro
        title="Academia"
        description="Trilhas de cursos, certificados e conteúdo para empreendedores. Em alinhamento com SDD §6.x (Academia)."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="font-serif text-lg text-marinha-900">Em breve</h2>
          <p className="mt-2 text-sm text-marinha-500">
            Catálogo de cursos, progresso e gamificação.
          </p>
        </Card>
        <Card variant="featured">
          <h2 className="font-serif text-lg text-marinha-900">Destaque</h2>
          <p className="mt-2 text-sm text-marinha-500">
            Trilhas sugeridas conforme o seu perfil (MEI, empresa, cidadão).
          </p>
        </Card>
      </div>
    </>
  );
}
