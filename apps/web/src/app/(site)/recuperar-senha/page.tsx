import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/layout/page-intro";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Recuperar senha",
};

export default function RecuperarSenhaPage() {
  return (
    <>
      <PageIntro
        title="Recuperar senha"
        description="Informe seu e-mail. Quando a integração estiver ativa, enviaremos um link para redefinir a senha."
      />
      <Card className="w-full">
        <form className="space-y-4" action="#" method="post">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              E-mail
            </label>
            <Input id="email" name="email" type="email" required placeholder="seu@email.com" />
          </div>
          <Button variant="primary" className="w-full" disabled>
            Enviar link (em breve)
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-marinha-500">
          <Link href="/login" className="font-semibold text-municipal-700 hover:underline">
            Voltar ao login
          </Link>
        </p>
      </Card>
    </>
  );
}
