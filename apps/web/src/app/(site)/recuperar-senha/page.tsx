"use client";

import Link from "next/link";
import { useState } from "react";
import { PageIntro } from "@/components/layout/page-intro";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-browser";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const res = await apiFetch("/api/v1/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (!res.ok && res.status !== 200) {
      // API retorna 200 mesmo para e-mails não encontrados (segurança)
      setError(res.error ?? "Não foi possível processar o pedido. Tente novamente.");
      return;
    }
    setSent(true);
  }

  return (
    <>
      <PageIntro
        title="Recuperar senha"
        description="Informe o seu e-mail e enviaremos um link para redefinir a senha."
      />
      <Card className="w-full max-w-md">
        {sent ? (
          <div className="space-y-4">
            <p className="rounded-btn border border-sucesso-500/30 bg-sucesso-500/10 px-4 py-3 text-sm text-sucesso-700">
              Se esse e-mail estiver cadastrado, você receberá um link em instantes. Verifique também a caixa de spam.
            </p>
            <p className="text-center text-sm text-marinha-500">
              <Link href="/login" className="font-semibold text-municipal-700 hover:underline">
                Voltar ao login
              </Link>
            </p>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit}>
            {error ? (
              <p className="rounded-btn border border-alerta-500/30 bg-alerta-500/10 px-3 py-2 text-sm text-alerta-600">
                {error}
              </p>
            ) : null}
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium">
                E-mail
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
              />
            </div>
            <Button variant="primary" className="w-full" type="submit" disabled={loading}>
              {loading ? "Enviando…" : "Enviar link de recuperação"}
            </Button>
            <p className="text-center text-sm text-marinha-500">
              <Link href="/login" className="font-semibold text-municipal-700 hover:underline">
                Voltar ao login
              </Link>
            </p>
          </form>
        )}
      </Card>
    </>
  );
}
