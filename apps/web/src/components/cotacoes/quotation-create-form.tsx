"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { useSelectedBusinessId } from "@/hooks/use-selected-business-id";
import { apiAuthFetch } from "@/lib/api-browser";
import { getAccessToken } from "@/lib/auth-storage";

export function QuotationCreateForm() {
  const router = useRouter();
  const businessId = useSelectedBusinessId();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<"private_market" | "public_procurement">("private_market");
  const [category, setCategory] = useState("");
  const [desiredDate, setDesiredDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    if (!getAccessToken()) {
      setError("Faça login para criar uma oportunidade.");
      return;
    }
    setLoading(true);
    let res: Awaited<ReturnType<typeof apiAuthFetch<{ id: string }>>>;
    try {
      res = await apiAuthFetch<{ id: string }>("/api/v1/quotations", {
        method: "POST",
        body: JSON.stringify({
          title,
          description: description.trim() || undefined,
          kind,
          category: category.trim() || undefined,
          desiredDate: desiredDate || undefined,
          requesterBusinessId: businessId || undefined,
        }),
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
    setCategory("");
    setDesiredDate("");
    setKind("private_market");
    router.refresh();
  }

  if (!getAccessToken()) {
    return (
      <p className="text-sm text-marinha-600">
        Para publicar uma oportunidade,{" "}
        <Link href="/login" className="font-semibold text-municipal-700 hover:underline">
          entre na sua conta
        </Link>
        . Depois você acompanha tudo em{" "}
        <Link href="/dashboard/cotacoes" className="font-semibold text-municipal-700 hover:underline">
          Minhas oportunidades
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
          Oportunidade registrada. Agora fornecedores locais já podem responder.
        </p>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="qt-kind" className="mb-1 block text-sm font-medium">
            Tipo
          </label>
          <select
            id="qt-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as "private_market" | "public_procurement")}
            className="focus-ring min-h-[44px] w-full rounded-btn border-2 border-marinha-900/25 bg-white px-3 py-2 text-sm text-marinha-900"
          >
            <option value="private_market">Mercado local</option>
            <option value="public_procurement">Compra pública</option>
          </select>
        </div>
        <div>
          <label htmlFor="qt-category" className="mb-1 block text-sm font-medium">
            Categoria
          </label>
          <Input
            id="qt-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Ex.: elétrica, alimentação, limpeza"
          />
        </div>
      </div>
      <div>
        <label htmlFor="qt-title" className="mb-1 block text-sm font-medium">
          Título
        </label>
        <Input
          id="qt-title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: Instalação elétrica em salão"
        />
      </div>
      <div>
        <label htmlFor="qt-desc" className="mb-1 block text-sm font-medium">
          Detalhes
        </label>
        <Textarea
          id="qt-desc"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Especificações, volume, local, forma de entrega..."
        />
      </div>
      <div>
        <label htmlFor="qt-date" className="mb-1 block text-sm font-medium">
          Data desejada
        </label>
        <Input id="qt-date" type="date" value={desiredDate} onChange={(e) => setDesiredDate(e.target.value)} />
      </div>
      <Button type="submit" variant="primary" disabled={loading}>
        {loading ? "Publicando..." : "Publicar oportunidade"}
      </Button>
      <p className="text-center text-xs text-marinha-500">
        <Link href="/dashboard/cotacoes" className="font-medium text-municipal-700 hover:underline">
          Ver todas as minhas oportunidades
        </Link>
      </p>
    </form>
  );
}
