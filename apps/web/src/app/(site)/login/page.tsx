import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/layout/page-intro";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Entrar",
};

export default function LoginPage() {
  return (
    <>
      <PageIntro
        title="Entrar"
        description="Use seu e-mail e senha para acessar sua conta. Em breve integração com a API de autenticação."
      />
      <Card className="mx-auto max-w-md">
        <form className="space-y-4" action="#" method="post">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              E-mail
            </label>
            <Input id="email" name="email" type="email" autoComplete="email" required placeholder="seu@email.com" />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Senha
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <Link href="/recuperar-senha" className="font-medium text-municipal-700 hover:underline">
              Esqueci minha senha
            </Link>
          </div>
          <Button variant="primary" className="w-full" disabled>
            Entrar (em breve)
          </Button>
        </form>
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
