"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiAuthFetch } from "@/lib/api-browser";
import { getAccessToken } from "@/lib/auth-storage";

type ErpRow = {
  id: string;
  tradeName: string;
  moderationStatus: string;
  isActive: boolean;
  tenant?: { slug: string; name?: string };
};

type ListErp = { items: ErpRow[]; total: number };

export default function AdminErpPage() {
  const [erp, setErp] = useState<ListErp | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    const e = await apiAuthFetch<ListErp>("/api/v1/platform/erp/businesses?take=80&skip=0");
    setLoading(false);
    if (e.status === 403) {
      setErr("Acesso exclusivo para super administrador da plataforma.");
      setErp(null);
      return;
    }
    if (!e.ok || !e.data) {
      setErr(e.error || "Falha ao carregar dados.");
      return;
    }
    setErp(e.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchErp(id: string, action: "approve" | "reject" | "suspend" | "activate") {
    const res = await apiAuthFetch<unknown>(`/api/v1/platform/erp/businesses/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      setErr(res.error || "Erro ao atualizar");
      return;
    }
    void load();
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Carregando…</p>;
  }

  if (err) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {err}
      </p>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ERP — Moderação de Negócios</h1>
        <p className="mt-1 text-sm text-gray-500">
          Negócios que usam o ERP no portal precisam de aprovação para operar. Total:{" "}
          <span className="font-semibold">{erp?.total ?? 0}</span>
        </p>
      </div>

      <div className="space-y-4">
        {erp?.items.map((row) => (
          <Card key={row.id} className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="font-semibold text-gray-900">{row.tradeName}</p>
                <p className="text-xs text-gray-500">
                  {row.tenant?.name ? `${row.tenant.name} · ` : ""}
                  {row.tenant?.slug ?? "?"}
                </p>
                <p className="mt-1 text-xs">
                  Estado: <span className="font-medium">{row.moderationStatus}</span> · ativo:{" "}
                  {row.isActive ? "sim" : "não"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="primary"
                  className="text-sm"
                  onClick={() => void patchErp(row.id, "approve")}
                >
                  Aprovar
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="text-sm"
                  onClick={() => void patchErp(row.id, "reject")}
                >
                  Rejeitar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-sm"
                  onClick={() => void patchErp(row.id, "suspend")}
                >
                  Suspender
                </Button>
                <Button
                  type="button"
                  variant="accent"
                  className="text-sm"
                  onClick={() => void patchErp(row.id, "activate")}
                >
                  Reativar
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {!erp?.items.length && (
          <p className="rounded-lg bg-gray-50 px-4 py-4 text-sm text-gray-500">
            Nenhum negócio ERP na fila. Novos cadastros aparecem aqui quando existirem.
          </p>
        )}
      </div>
    </div>
  );
}
