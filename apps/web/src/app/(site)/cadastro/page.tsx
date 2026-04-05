import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/layout/page-intro";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
      <Card className="mx-auto max-w-md">
        <form className="space-y-4" action="#" method="post">
          <div>
            <label htmlFor="fullName" className="mb-1 block text-sm font-medium">
              Nome completo
            </label>
            <Input id="fullName" name="fullName" required placeholder="Nome como no documento" />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              E-mail
            </label>
            <Input id="email" name="email" type="email" required placeholder="seu@email.com" />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Senha
            </label>
            <Input id="password" name="password" type="password" required placeholder="Mínimo 8 caracteres" />
          </div>
          <label className="flex cursor-pointer gap-3 text-sm text-marinha-700">
            <input
              type="checkbox"
              name="acceptTerms"
              required
              className="focus-ring mt-1 h-4 w-4 rounded border-marinha-900/25 text-municipal-600"
            />
            <span>
              Li e aceito os termos de uso e a política de privacidade (LGPD).
            </span>
          </label>
          <Button variant="primary" className="w-full" disabled>
            Cadastrar (em breve)
          </Button>
        </form>
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
