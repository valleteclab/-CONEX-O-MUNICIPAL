"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-browser";
import { setSupportToken } from "@/lib/support-auth-storage";

type LoginResponse = {
  token: string;
  expiresIn: string;
  session: {
    username: string;
    displayName: string;
  };
};

export default function SupportLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [redirectTo, setRedirectTo] = useState("/suporte-tecnico");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const redirect = new URLSearchParams(window.location.search).get("redirect");
    if (redirect?.startsWith("/")) {
      setRedirectTo(redirect);
    }
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const res = await apiFetch<LoginResponse>("/api/v1/support-auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    setLoading(false);
    if (!res.ok || !res.data) {
      setError(res.error ?? "Não foi possível entrar na central de suporte.");
      return;
    }

    setSupportToken(res.data.token);
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.15),_transparent_35%),linear-gradient(180deg,_#020617,_#0f172a)] px-6 py-10 text-white">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr,0.95fr]">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-300">
            Suporte técnico
          </p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight">
            Central isolada para monitorar IA e integrações críticas.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300">
            Use este acesso apenas para operação técnica da plataforma, diagnóstico de integrações
            e ajustes da configuração operacional da IA.
          </p>
        </div>

        <Card className="rounded-[32px] border border-white/10 bg-slate-900/80 p-8 shadow-2xl">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-300">
                Acesso isolado
              </p>
              <h2 className="mt-3 text-3xl text-white">Entrar na central</h2>
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            <div>
              <label htmlFor="username" className="mb-2 block text-sm font-medium text-slate-200">
                Usuário
              </label>
              <Input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="support-admin"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-200">
                Senha
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Digite a senha de suporte"
                autoComplete="current-password"
                required
              />
            </div>

            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Entrando..." : "Entrar na central de suporte"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
