"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { apiAuthFetch } from "@/lib/api-browser";
import { getAccessToken } from "@/lib/auth-storage";
import { cn } from "@/lib/cn";

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

type DirFilter = "pending" | "approved" | "rejected" | "all";

const FILTERS: { id: DirFilter; label: string; hint: string }[] = [
  {
    id: "pending",
    label: "Pendentes",
    hint: "Aguardam decisão (aprovou ou rejeitou).",
  },
  {
    id: "approved",
    label: "Aprovadas",
    hint: "Já aprovadas; pode suspender, republicar ou rejeitar.",
  },
  {
    id: "rejected",
    label: "Rejeitadas",
    hint: "Pode aprovar de novo se mudar de ideia.",
  },
  { id: "all", label: "Todas", hint: "Lista completa." },
];

function statusBadgeTone(
  status: string,
): "warning" | "success" | "danger" | "neutral" {
  if (status === "pending") return "warning";
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  return "neutral";
}

function statusLabel(status: string): string {
  if (status === "pending") return "Pendente";
  if (status === "approved") return "Aprovada";
  if (status === "rejected") return "Rejeitada";
  return status;
}

export default function AdminDiretorioPage() {
  const [dir, setDir] = useState<ListDir | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DirFilter>("pending");

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    const qs = new URLSearchParams({ take: "80", skip: "0" });
    if (filter !== "all") {
      qs.set("status", filter);
    }
    const d = await apiAuthFetch<ListDir>(
      `/api/v1/platform/directory/listings?${qs.toString()}`,
    );
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
  }, [filter]);

  useEffect(() => {
    setDir(null);
  }, [filter]);

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
    setErr(null);
    void load();
  }

  const filterMeta = FILTERS.find((f) => f.id === filter)!;

  if (loading && dir === null && !err) {
    return <p className="text-sm text-gray-500">Carregando…</p>;
  }

  if (err && !dir) {
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
          Aprove ou rejeite vitrines antes de aparecerem no portal público. Use o filtro abaixo
          para ver o que falta tratar.
        </p>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <nav className="flex flex-wrap gap-1" aria-label="Filtrar por estado">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-t-lg px-4 py-2.5 text-sm font-semibold transition-colors",
                filter === f.id ?
                  "border-b-2 border-teal-600 bg-teal-50 text-teal-900"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              {f.label}
            </button>
          ))}
        </nav>
        <p className="mt-2 mb-3 text-xs text-gray-500">{filterMeta.hint}</p>
      </div>

      {err ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {err}
        </p>
      ) : null}

      <p className="mb-4 text-sm text-gray-600">
        Total neste filtro: <span className="font-semibold text-gray-900">{dir?.total ?? 0}</span>
      </p>

      <div className="space-y-4">
        {dir?.items.map((row) => (
          <Card key={row.id} className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 gap-y-1">
                  <p className="font-semibold text-gray-900">{row.tradeName}</p>
                  <Badge tone={statusBadgeTone(row.moderationStatus)}>
                    {statusLabel(row.moderationStatus)}
                  </Badge>
                  {row.moderationStatus === "approved" ? (
                    <span className="text-xs text-gray-500">
                      {row.isPublished ? "· No ar no diretório" : "· Aprovada mas oculta (suspensa)"}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {row.tenant?.slug ?? "?"} · {row.slug} · {row.owner?.email}
                </p>
              </div>
              <DirectoryRowActions row={row} onAction={patchDir} />
            </div>
          </Card>
        ))}
        {!loading && !dir?.items.length ? (
          <p className="rounded-lg bg-gray-50 px-4 py-4 text-sm text-gray-600">
            {filter === "pending" ?
              "Nenhuma vitrine pendente. Tudo em dia — ou abra o filtro «Aprovadas» / «Todas» para rever cadastros."
            : filter === "approved" ?
              "Nenhuma vitrine aprovada com este filtro."
            : filter === "rejected" ?
              "Nenhuma vitrine rejeitada."
            : "Nenhum cadastro no diretório."}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function DirectoryRowActions({
  row,
  onAction,
}: {
  row: DirRow;
  onAction: (id: string, action: "approve" | "reject" | "suspend" | "publish") => void;
}) {
  const st = row.moderationStatus;

  if (st === "pending") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="primary"
          className="text-sm"
          onClick={() => void onAction(row.id, "approve")}
        >
          Aprovar
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="text-sm"
          onClick={() => void onAction(row.id, "reject")}
        >
          Rejeitar
        </Button>
      </div>
    );
  }

  if (st === "approved") {
    return (
      <div className="flex max-w-xl flex-col items-stretch gap-2 sm:items-end">
        <p className="text-xs text-gray-500">
          Já aprovada — não precisa aprovar de novo. Use as ações abaixo se quiser alterar a
          situação.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          {row.isPublished ? (
            <Button
              type="button"
              variant="secondary"
              className="text-sm"
              onClick={() => void onAction(row.id, "suspend")}
            >
              Suspender (tirar do ar)
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              className="text-sm"
              onClick={() => void onAction(row.id, "publish")}
            >
              Republicar no diretório
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            className="text-sm text-red-700 hover:bg-red-50"
            onClick={() => void onAction(row.id, "reject")}
          >
            Rejeitar cadastro
          </Button>
        </div>
      </div>
    );
  }

  if (st === "rejected") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="primary"
          className="text-sm"
          onClick={() => void onAction(row.id, "approve")}
        >
          Aprovar novamente
        </Button>
      </div>
    );
  }

  return null;
}
