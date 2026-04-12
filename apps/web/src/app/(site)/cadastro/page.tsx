import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import { PageIntro } from "@/components/layout/page-intro";
import { Card } from "@/components/ui/card";
import { buildEntrarHref } from "@/lib/auth-routes";

export const metadata: Metadata = {
  title: "Criar conta",
};

export default function CadastroPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageIntro
        title="Criar conta"
        description="Abra seu acesso para acompanhar oportunidades, presenca digital e a jornada de entrada na area da empresa."
      />

      <Card className="w-full">
        <RegisterForm />
        <p className="mt-6 border-t border-marinha-900/8 pt-6 text-center text-sm text-marinha-500">
          Ja tem conta?{" "}
          <Link href={buildEntrarHref("portal")} className="font-semibold text-municipal-700 hover:underline">
            Entrar
          </Link>
        </p>
      </Card>
    </div>
  );
}
