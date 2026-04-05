import type { Metadata } from "next";
import Link from "next/link";
import { SuperAdminPanel } from "@/components/plataforma/super-admin-panel";
import { PageIntro } from "@/components/layout/page-intro";

export const metadata: Metadata = {
  title: "Plataforma — moderação",
};

export default function DashboardPlataformaPage() {
  return (
    <>
      <PageIntro
        title="Moderação de cadastros"
        description="Acesso restrito a super administradores da plataforma: moderação do diretório e do ERP, e gestão dos cursos da Academia por município."
        badge="Plataforma"
      />
      <p className="mb-6 text-sm text-marinha-600">
        <Link href="/" className="font-medium text-municipal-700 hover:underline">
          ← Início
        </Link>
      </p>
      <SuperAdminPanel />
    </>
  );
}
