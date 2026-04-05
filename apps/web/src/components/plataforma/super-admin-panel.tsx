"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlatformAcademyPanel } from "./platform-academy-panel";
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

type ErpRow = {
  id: string;
  tradeName: string;
  moderationStatus: string;
  isActive: boolean;
  tenant?: { slug: string; name?: string };
};

type ListDir = { items: DirRow[]; total: number };
type ListErp = { items: ErpRow[]; total: number };

export function SuperAdminPanel() {
  const [dir, setDir] = useState<ListDir | null>(null);
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
    const [d, e] = await Promise.all([
      apiAuthFetch<ListDir>("/api/v1/platform/directory/listings?take=80&skip=0"),
      apiAuthFetch<ListErp>("/api/v1/platform/erp/businesses?take=80&skip=0"),
    ]);
    setLoading(false);
    if (d.status === 403 || e.status === 403) {
      setErr("Acesso exclusivo para super administrador da plataforma.");
      setDir(null);
      setErp(null);
      return;
    }
    if (!d.ok || !d.data || !e.ok || !e.data) {
      setErr(d.error || e.error || "Falha ao carregar dados.");
      return;
    }
    setDir(d.data);
    setErp(e.data);
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

  if (!getAccessToken()) {
    return (
      <Card className="max-w-lg p-5">
        <p className="text-sm font-medium text-marinha-900">Sessão necessária</p>
        <p className="mt-2 text-sm text-marinha-600">
          Use a entrada dedicada à equipe da plataforma — não é o mesmo link que empresas e cidadãos usam no topo do site.
        </p>
        <Link
          href="/plataforma/entrar"
          className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-btn bg-municipal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-municipal-700"
        >
          Abrir página de entrada (super admin)
        </Link>
      </Card>
    );
  }

  if (loading) {
    return <p className="text-sm text-marinha-500">A carregar…</p>;
  }

  if (err) {
    return (
      <p className="rounded-btn border border-alerta-500/30 bg-alerta-500/10 px-3 py-2 text-sm text-alerta-700">
        {err}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-marinha-900/10 bg-surface-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-marinha-900/10 pb-3">
          <h2 className="font-serif text-xl font-bold text-marinha-900">
            <span className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-municipal-600 text-sm font-bold text-white">
              1
            </span>
            Diretório — vitrines
          </h2>
          <span className="text-xs font-medium uppercase tracking-wide text-marinha-500">
            Fila de moderação
          </span>
        </div>
        <p className="mt-4 text-sm text-marinha-600">
          Quem abre uma vitrine no portal passa por aqui. Novos registros podem ficar{" "}
          <strong>pendentes</strong> até aprovar. Total na lista: {dir?.total ?? 0}
        </p>
        <ul className="mt-4 space-y-3">
          {dir?.items.map((row) => (
            <li key={row.id}>
              <Card className="p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold text-marinha-900">{row.tradeName}</p>
                    <p className="text-xs text-marinha-500">
                      {row.tenant?.slug ?? "?"} · {row.slug} · {row.owner?.email}
                    </p>
                    <p className="mt-1 text-xs">
                      Estado: <span className="font-medium">{row.moderationStatus}</span> ·
                      publicado: {row.isPublished ? "sim" : "não"}
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
            </li>
          ))}
        </ul>
        {!dir?.items.length ? (
          <p className="mt-4 rounded-btn bg-marinha-900/[0.04] px-3 py-3 text-sm text-marinha-600">
            Nenhum pedido na fila. Quando houver vitrines a moderar, aparecem aqui.
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-marinha-900/10 bg-surface-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-marinha-900/10 pb-3">
          <h2 className="font-serif text-xl font-bold text-marinha-900">
            <span className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-municipal-600 text-sm font-bold text-white">
              2
            </span>
            ERP — negócios
          </h2>
          <span className="text-xs font-medium uppercase tracking-wide text-marinha-500">
            Fila de moderação
          </span>
        </div>
        <p className="mt-4 text-sm text-marinha-600">
          Negócios que usam o ERP no portal precisam de aprovação para operar. Total na lista:{" "}
          {erp?.total ?? 0}
        </p>
        <ul className="mt-4 space-y-3">
          {erp?.items.map((row) => (
            <li key={row.id}>
              <Card className="p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold text-marinha-900">{row.tradeName}</p>
                    <p className="text-xs text-marinha-500">
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
            </li>
          ))}
        </ul>
        {!erp?.items.length ? (
          <p className="mt-4 rounded-btn bg-marinha-900/[0.04] px-3 py-3 text-sm text-marinha-600">
            Nenhum negócio ERP na fila. Novos cadastros aparecem aqui quando existirem.
          </p>
        ) : null}
      </section>

      <PlatformAcademyPanel />
    </div>
  );
}
