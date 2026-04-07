import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { PageIntro } from "@/components/layout/page-intro";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Área da empresa — entrar",
  description: "Acesso para responsáveis por empresas e negócios que utilizam o ERP municipal.",
  robots: { index: false, follow: false },
};

export default function AreaDaEmpresaEntrarPage() {
  return (
    <>
      <PageIntro
        title="Entrar na área da empresa"
        description="Use o acesso da empresa para acompanhar análise, concluir o cadastro fiscal e operar o ERP após a liberação da prefeitura."
        badge="Área da empresa"
      />

      <Card className="w-full">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-card bg-marinha-900/5" />}>
          <LoginForm />
        </Suspense>
        <div className="mt-6 border-t border-marinha-900/8 pt-6 text-center text-sm text-marinha-500">
          <p>
            Ainda não possui acesso?{" "}
            <Link href="/cadastro" className="font-semibold text-municipal-700 hover:underline">
              Criar conta
            </Link>
          </p>
          <p className="mt-2">
            Quer iniciar a adesão da empresa?{" "}
            <Link href="/area-da-empresa/cadastro" className="font-semibold text-municipal-700 hover:underline">
              Abrir cadastro empresarial
            </Link>
          </p>
        </div>
      </Card>
    </>
  );
}
