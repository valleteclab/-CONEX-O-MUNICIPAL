import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { PageIntro } from "@/components/layout/page-intro";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Entrar",
};

export default function LoginPage() {
  return (
    <>
      <PageIntro
        title="Entrar"
        description="Use seu e-mail e senha contra a API Nest (JWT + refresh)."
      />
      <Card className="w-full">
        <LoginForm />
        <p className="mt-6 border-t border-marinha-900/8 pt-6 text-center text-sm text-marinha-500">
          Não tem conta?{" "}
          <Link href="/cadastro" className="font-semibold text-municipal-700 hover:underline">
            Cadastrar
          </Link>
        </p>
      </Card>
    </>
  );
}
