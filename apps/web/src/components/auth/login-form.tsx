"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiAuthFetch, apiFetch } from "@/lib/api-browser";
import { setTokens } from "@/lib/auth-storage";

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  tenantId: string;
};

type AuthMeResponse = {
  role: string;
};

export type LoginFormIntent = "portal" | "platform";

type LoginFormProps = {
  /** `portal` = utilizadores do município / empresas (entrada normal). `platform` = só equipa super admin. */
  intent?: LoginFormIntent;
};

export function LoginForm({ intent = "portal" }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    let res: Awaited<ReturnType<typeof apiFetch<LoginResponse>>>;
    try {
      res = await apiFetch<LoginResponse>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    } finally {
      setLoading(false);
    }
    if (!res.ok || !res.data) {
      setError(res.error || "Falha no login");
      return;
    }
    setTokens(res.data.accessToken, res.data.refreshToken, res.data.tenantId);

    if (intent === "platform") {
      const me = await apiAuthFetch<AuthMeResponse>("/api/v1/auth/me");
      if (!me.ok || !me.data) {
        setError(me.error || "Não foi possível confirmar o perfil.");
        return;
      }
      if (me.data.role !== "super_admin") {
        setError(
          "Esta entrada é só para super administradores da plataforma. A sua sessão está ativa (conta de município ou empresa): use o menu do site para continuar, ou termine sessão se entrou aqui por engano.",
        );
        return;
      }
      router.push("/dashboard/plataforma");
      router.refresh();
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
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
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
        />
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link href="/recuperar-senha" className="font-medium text-municipal-700 hover:underline">
          Esqueci minha senha
        </Link>
        {intent === "platform" ? (
          <Link href="/login" className="font-medium text-marinha-600 hover:underline">
            Entrar como utilizador do município
          </Link>
        ) : null}
      </div>
      <Button variant="primary" className="w-full" type="submit" disabled={loading}>
        {loading ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
