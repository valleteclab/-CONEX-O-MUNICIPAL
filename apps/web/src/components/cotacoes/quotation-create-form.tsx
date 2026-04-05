"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/input";
import { apiAuthFetch } from "@/lib/api-browser";
import { getAccessToken } from "@/lib/auth-storage";

export function QuotationCreateForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    if (!getAccessToken()) {
      setError("Faça login para criar uma solicitação.");
      return;
    }
    setLoading(true);
    let res: Awaited<ReturnType<typeof apiAuthFetch<{ id: string }>>>;
    try {
      res = await apiAuthFetch<{ id: string }>("/api/v1/quotations", {
        method: "POST",
        body: JSON.stringify({ title, description: description.trim() || undefined }),
      });
    } finally {
      setLoading(false);
    }
    if (!res.ok) {
      setError(res.error || "Erro ao enviar");
      return;
    }
    setOk(true);
    setTitle("");
    setDescription("");
    router.refresh();
  }

  if (!getAccessToken()) {
    return (
      <p className="text-sm text-marinha-600">
        Para publicar uma solicitação,{" "}
        <Link href="/login" className="font-semibold text-municipal-700 hover:underline">
          entre na sua conta
        </Link>
        . Depois pode acompanhar tudo em{" "}
        <Link href="/dashboard/cotacoes" className="font-semibold text-municipal-700 hover:underline">
          Minhas cotações
        </Link>
        .
      </p>
    );
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      {error ? (
        <p className="rounded-btn border border-alerta-500/30 bg-alerta-500/10 px-3 py-2 text-sm text-alerta-600">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p className="rounded-btn border border-sucesso-500/30 bg-sucesso-500/10 px-3 py-2 text-sm text-sucesso-700">
          Solicitação registrada. Acompanhe na lista abaixo.
        </p>
      ) : null}
      <div>
        <label htmlFor="qt-title" className="mb-1 block text-sm font-medium">
          Título
        </label>
        <Input
          id="qt-title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: Reforma elétrica em salão"
        />
      </div>
      <div>
        <label htmlFor="qt-desc" className="mb-1 block text-sm font-medium">
          Detalhes (opcional)
        </label>
        <Textarea
          id="qt-desc"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Especificações, prazo desejado, local…"
        />
      </div>
      <Button type="submit" variant="primary" disabled={loading}>
        {loading ? "Enviando…" : "Publicar solicitação"}
      </Button>
      <p className="text-center text-xs text-marinha-500">
        <Link href="/dashboard/cotacoes" className="font-medium text-municipal-700 hover:underline">
          Ver todas as minhas solicitações
        </Link>
      </p>
    </form>
  );
}
