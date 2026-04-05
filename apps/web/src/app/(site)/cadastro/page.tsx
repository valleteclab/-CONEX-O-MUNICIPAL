import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import { PageIntro } from "@/components/layout/page-intro";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Cadastrar",
};

export default function CadastroPage() {
  return (
    <>
      <PageIntro
        title="Criar conta"
        description="Cadastro para cidadãos, MEIs e empresas. Os dados serão tratados conforme a LGPD."
      />
      <Card className="w-full">
        <RegisterForm />
        <p className="mt-6 border-t border-marinha-900/8 pt-6 text-center text-sm text-marinha-500">
          Já tem conta?{" "}
          <Link href="/login" className="font-semibold text-municipal-700 hover:underline">
            Entrar
          </Link>
        </p>
      </Card>
    </>
  );
}
