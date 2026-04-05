import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { PageIntro } from "@/components/layout/page-intro";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Gestão da plataforma — entrar",
  description: "Acesso à equipa Conexão Municipal (super administrador).",
  robots: { index: false, follow: false },
};

export default function PlataformaEntrarPage() {
  return (
    <>
      <PageIntro
        title="Gestão da plataforma"
        description="Entrada reservada à equipa que modera cadastros, aprova negócios e gere a Academia em todos os municípios. Não utilize esta página para registar ou gerir a sua empresa — isso faz-se pelo menu habitual do site (Entrar / Cadastrar)."
        badge="Equipa plataforma"
      />
      <Card className="w-full">
        <LoginForm intent="platform" />
        <p className="mt-6 border-t border-marinha-900/8 pt-6 text-center text-sm text-marinha-500">
          É utilizador ou empresa no município?{" "}
          <Link href="/login" className="font-semibold text-municipal-700 hover:underline">
            Entrar no portal
          </Link>{" "}
          ou{" "}
          <Link href="/cadastro" className="font-semibold text-municipal-700 hover:underline">
            criar conta
          </Link>
          .
        </p>
      </Card>
    </>
  );
}
