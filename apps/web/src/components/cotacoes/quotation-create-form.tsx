"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-browser";
import { getAccessToken } from "@/lib/auth-storage";

export function QuotationCreateForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    const t = getAccessToken();
    if (!t) {
      setError("Faça login para criar uma solicitação.");
      return;
    }
    setLoading(true);
    const res = await apiFetch<{ id: string }>("/api/v1/quotations", {
      method: "POST",
      headers: { Authorization: `Bearer ${t}` },
      body: JSON.stringify({ title, description: description.trim() || undefined }),
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error || "Erro ao enviar");
      return;
    }
    setOk(true);
    setTitle("");
    setDescription("");
  }

  if (!getAccessToken()) {
    return (
      <p className="text-sm text-marinha-600">
        Para publicar uma solicitação,{" "}
        <Link href="/login" className="font-semibold text-municipal-700 hover:underline">
          entre na sua conta
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
    </form>
  );
}
