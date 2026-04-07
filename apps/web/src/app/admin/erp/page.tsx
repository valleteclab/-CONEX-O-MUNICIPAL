"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { apiAuthFetch } from "@/lib/api-browser";
import { getAccessToken } from "@/lib/auth-storage";
import { cn } from "@/lib/cn";

type ErpRow = {
  id: string;
  tradeName: string;
  legalName?: string | null;
  document?: string | null;
  responsibleName?: string | null;
  responsibleEmail?: string | null;
  responsiblePhone?: string | null;
  cityIbgeCode?: string | null;
  inscricaoMunicipal?: string | null;
  inscricaoEstadual?: string | null;
  address?: Record<string, string> | null;
  moderationStatus: string;
  isActive: boolean;
  tenant?: { slug: string; name?: string };
};

type ListErp = { items: ErpRow[]; total: number };

type ErpFilter = "pending" | "approved" | "rejected" | "all";

const FILTERS: { id: ErpFilter; label: string; hint: string }[] = [
  {
    id: "pending",
    label: "Pendentes",
    hint: "Aguardam aprovação ou rejeição para operar no ERP.",
  },
  {
    id: "approved",
    label: "Aprovados",
    hint: "Já aprovados; pode suspender operação, reativar ou rejeitar.",
  },
  {
    id: "rejected",
    label: "Rejeitados",
    hint: "Pode aprovar de novo se fizer sentido.",
  },
  { id: "all", label: "Todos", hint: "Lista completa." },
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
  if (status === "approved") return "Aprovado";
  if (status === "rejected") return "Rejeitado";
  return status;
}

export default function AdminErpPage() {
  const [erp, setErp] = useState<ListErp | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ErpFilter>("pending");

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
    const e = await apiAuthFetch<ListErp>(`/api/v1/platform/erp/businesses?${qs.toString()}`);
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
  }, [filter]);

  useEffect(() => {
    setErp(null);
  }, [filter]);

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
    setErr(null);
    void load();
  }

  const filterMeta = FILTERS.find((f) => f.id === filter)!;

  if (loading && erp === null && !err) {
    return <p className="text-sm text-gray-500">Carregando…</p>;
  }

  if (err && !erp) {
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
          Negócios que usam o ERP no portal precisam de aprovação para operar. Use o filtro para ver o
          que falta tratar.
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
        Total neste filtro: <span className="font-semibold text-gray-900">{erp?.total ?? 0}</span>
      </p>

      <div className="space-y-4">
        {erp?.items.map((row) => (
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
                      {row.isActive ? "· Operação ativa no ERP" : "· Aprovado mas suspenso (inativo)"}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {row.tenant?.name ? `${row.tenant.name} · ` : ""}
                  {row.tenant?.slug ?? "?"}
                </p>
                <div className="mt-3 grid gap-2 text-xs text-gray-600 md:grid-cols-2">
                  <p>
                    <span className="font-semibold text-gray-800">Responsável:</span>{" "}
                    {row.responsibleName || "Não informado"}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-800">Contato:</span>{" "}
                    {row.responsibleEmail || "sem e-mail"}
                    {row.responsiblePhone ? ` · ${row.responsiblePhone}` : ""}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-800">CNPJ:</span>{" "}
                    {row.document || "Não informado"}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-800">Razão social:</span>{" "}
                    {row.legalName || "Não informada"}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-800">Cidade IBGE:</span>{" "}
                    {row.cityIbgeCode || "Não informada"}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-800">Inscrições:</span>{" "}
                    IM {row.inscricaoMunicipal || "—"} · IE {row.inscricaoEstadual || "—"}
                  </p>
                  <p className="md:col-span-2">
                    <span className="font-semibold text-gray-800">Endereço:</span>{" "}
                    {row.address?.logradouro || row.address?.city ? (
                      <>
                        {[row.address?.logradouro, row.address?.numero, row.address?.bairro]
                          .filter(Boolean)
                          .join(", ")}
                        {row.address?.city || row.address?.uf ?
                          ` · ${[row.address?.city, row.address?.uf].filter(Boolean).join(" - ")}`
                        : ""}
                      </>
                    ) : (
                      "Não informado"
                    )}
                  </p>
                </div>
              </div>
              <ErpRowActions row={row} onAction={patchErp} />
            </div>
          </Card>
        ))}
        {!loading && !erp?.items.length ? (
          <p className="rounded-lg bg-gray-50 px-4 py-4 text-sm text-gray-600">
            {filter === "pending" ?
              "Nenhum negócio ERP pendente. Tudo em dia — ou abra «Aprovados» / «Todos» para rever cadastros."
            : filter === "approved" ?
              "Nenhum negócio aprovado com este filtro."
            : filter === "rejected" ?
              "Nenhum negócio rejeitado."
            : "Nenhum cadastro ERP."}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ErpRowActions({
  row,
  onAction,
}: {
  row: ErpRow;
  onAction: (id: string, action: "approve" | "reject" | "suspend" | "activate") => void;
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
          Já aprovado — não precisa aprovar de novo. Use as ações abaixo para suspender, reativar ou
          rejeitar o cadastro.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          {row.isActive ? (
            <Button
              type="button"
              variant="secondary"
              className="text-sm"
              onClick={() => void onAction(row.id, "suspend")}
            >
              Suspender operação
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              className="text-sm"
              onClick={() => void onAction(row.id, "activate")}
            >
              Reativar operação
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
