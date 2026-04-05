"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-browser";
import { setTokens } from "@/lib/auth-storage";

type RegisterResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  tenantId: string;
};

export function RegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"citizen" | "mei" | "company">("citizen");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!acceptTerms) {
      setError("É necessário aceitar os termos.");
      return;
    }
    setLoading(true);
    let res: Awaited<ReturnType<typeof apiFetch<RegisterResponse>>>;
    try {
      res = await apiFetch<RegisterResponse>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({
          fullName,
          email,
          phone: phone.trim() || undefined,
          password,
          role,
          acceptTerms: true,
        }),
      });
    } finally {
      setLoading(false);
    }
    if (!res.ok || !res.data) {
      setError(res.error || "Não foi possível cadastrar");
      return;
    }
    setTokens(res.data.accessToken, res.data.refreshToken, res.data.tenantId);
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
        <label htmlFor="fullName" className="mb-1 block text-sm font-medium">
          Nome completo
        </label>
        <Input
          id="fullName"
          name="fullName"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Nome como no documento"
        />
      </div>
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
        />
      </div>
      <div>
        <label htmlFor="phone" className="mb-1 block text-sm font-medium">
          Telefone (opcional)
        </label>
        <Input
          id="phone"
          name="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(77) 98888-7777"
        />
      </div>
      <div>
        <label htmlFor="role" className="mb-1 block text-sm font-medium">
          Perfil
        </label>
        <select
          id="role"
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value as "citizen" | "mei" | "company")}
          className="focus-ring min-h-[44px] w-full rounded-btn border-2 border-marinha-900/25 bg-white px-3 py-2 text-sm text-marinha-900"
        >
          <option value="citizen">Cidadão</option>
          <option value="mei">MEI</option>
          <option value="company">Empresa</option>
        </select>
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium">
          Senha
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mín. 8 caracteres, 1 maiúscula e 1 número"
        />
        <p className="mt-1 text-xs text-marinha-500">
          A API exige ao menos uma letra maiúscula e um número.
        </p>
      </div>
      <label className="flex cursor-pointer gap-3 text-sm text-marinha-700">
        <input
          type="checkbox"
          name="acceptTerms"
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
          required
          className="focus-ring mt-1 h-4 w-4 rounded border-marinha-900/25 text-municipal-600"
        />
        <span>Li e aceito os termos de uso e a política de privacidade (LGPD).</span>
      </label>
      <Button variant="primary" className="w-full" type="submit" disabled={loading}>
        {loading ? "Cadastrando…" : "Cadastrar"}
      </Button>
    </form>
  );
}
