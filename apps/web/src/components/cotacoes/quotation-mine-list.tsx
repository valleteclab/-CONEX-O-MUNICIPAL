"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiAuthFetch } from "@/lib/api-browser";
import { getAccessToken } from "@/lib/auth-storage";
import { quotationStatusLabel } from "@/lib/quotation-labels";
import type { QuotationRequestDto } from "@/types/quotations";

type ListResponse = { items: QuotationRequestDto[]; total: number };

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function kindLabel(kind: QuotationRequestDto["kind"]) {
  return kind === "public_procurement" ? "Compra pública" : "Mercado local";
}

export function QuotationMineList() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      setData(null);
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    const res = await apiAuthFetch<ListResponse>("/api/v1/quotations/mine?take=100");
    setLoading(false);
    if (!res.ok || !res.data) {
      setError(res.error || "Não foi possível carregar");
      setData(null);
      return;
    }
    setData(res.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!getAccessToken()) {
    return (
      <p className="text-sm text-marinha-600">
        <Link href="/login" className="font-semibold text-municipal-700 hover:underline">
          Entre na sua conta
        </Link>{" "}
        para ver as suas oportunidades.
      </p>
    );
  }

  if (loading) {
    return <p className="text-sm text-marinha-500">A carregar...</p>;
  }

  if (error) {
    return (
      <p className="rounded-btn border border-alerta-500/30 bg-alerta-500/10 px-3 py-2 text-sm text-alerta-600">
        {error}
      </p>
    );
  }

  if (!data?.items.length) {
    return (
      <p className="text-sm text-marinha-500">
        Ainda não há oportunidades publicadas. Crie uma na{" "}
        <Link href="/oportunidades" className="font-semibold text-municipal-700 hover:underline">
          central de oportunidades
        </Link>
        .
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {data.items.map((q) => (
        <li key={q.id} className="rounded-btn border border-marinha-900/10 bg-surface px-3 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-marinha-100 px-2 py-0.5 text-xs text-marinha-700">
              {kindLabel(q.kind)}
            </span>
            {q.category ? (
              <span className="rounded-full bg-municipal-600/10 px-2 py-0.5 text-xs text-municipal-800">
                {q.category}
              </span>
            ) : null}
          </div>
          <p className="mt-2 font-semibold text-marinha-900">{q.title}</p>
          {q.description ? <p className="mt-1 line-clamp-2 text-marinha-600">{q.description}</p> : null}
          <p className="mt-2 text-xs text-marinha-500">
            {formatDate(q.createdAt)} · {quotationStatusLabel(q.status)} · {q.responsesCount} respostas
          </p>
        </li>
      ))}
    </ul>
  );
}
