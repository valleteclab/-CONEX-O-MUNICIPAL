"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiAuthFetch } from "@/lib/api-browser";
import { getAccessToken } from "@/lib/auth-storage";

type DirRow = {
  id: string;
  tradeName: string;
  slug: string;
  moderationStatus: string;
  isPublished: boolean;
  tenant?: { slug: string; name?: string };
  owner?: { email: string };
};

type ListDir = { items: DirRow[]; total: number };

export default function AdminDiretorioPage() {
  const [dir, setDir] = useState<ListDir | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    const d = await apiAuthFetch<ListDir>("/api/v1/platform/directory/listings?take=80&skip=0");
    setLoading(false);
    if (d.status === 403) {
      setErr("Acesso exclusivo para super administrador da plataforma.");
      setDir(null);
      return;
    }
    if (!d.ok || !d.data) {
      setErr(d.error || "Falha ao carregar dados.");
      return;
    }
    setDir(d.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchDir(id: string, action: "approve" | "reject" | "suspend" | "publish") {
    const res = await apiAuthFetch<unknown>(`/api/v1/platform/directory/listings/${id}`, {
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
        <h1 className="text-2xl font-bold text-gray-900">Diretório — Moderação</h1>
        <p className="mt-1 text-sm text-gray-500">
          Aprovar, rejeitar ou suspender vitrines de negócios cadastradas no portal. Total:{" "}
          <span className="font-semibold">{dir?.total ?? 0}</span>
        </p>
      </div>

      <div className="space-y-4">
        {dir?.items.map((row) => (
          <Card key={row.id} className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="font-semibold text-gray-900">{row.tradeName}</p>
                <p className="text-xs text-gray-500">
                  {row.tenant?.slug ?? "?"} · {row.slug} · {row.owner?.email}
                </p>
                <p className="mt-1 text-xs">
                  Estado: <span className="font-medium">{row.moderationStatus}</span> · publicado:{" "}
                  {row.isPublished ? "sim" : "não"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="primary"
                  className="text-sm"
                  onClick={() => void patchDir(row.id, "approve")}
                >
                  Aprovar
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="text-sm"
                  onClick={() => void patchDir(row.id, "reject")}
                >
                  Rejeitar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-sm"
                  onClick={() => void patchDir(row.id, "suspend")}
                >
                  Suspender
                </Button>
                <Button
                  type="button"
                  variant="accent"
                  className="text-sm"
                  onClick={() => void patchDir(row.id, "publish")}
                >
                  Republicar
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {!dir?.items.length && (
          <p className="rounded-lg bg-gray-50 px-4 py-4 text-sm text-gray-500">
            Nenhum pedido na fila. Quando houver vitrines a moderar, aparecem aqui.
          </p>
        )}
      </div>
    </div>
  );
}
