"use client";

import { useCallback, useEffect, useState } from "react";
import { PageIntro } from "@/components/layout/page-intro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErpFiscalEmitModal } from "@/components/erp/erp-fiscal-emit-modal";
import { useSelectedBusinessId } from "@/hooks/use-selected-business-id";
import { erpFetch } from "@/lib/api-browser";

type FiscalDoc = {
  id: string;
  type: "nfse" | "nfe" | "nfce";
  status: "pending" | "processing" | "authorized" | "rejected" | "cancelled" | "error";
  numero: string | null;
  serie: string | null;
  pdfUrl: string | null;
  xmlUrl: string | null;
  emittedAt: string | null;
  createdAt: string;
  salesOrder?: { id: string; totalAmount: string } | null;
};

function typeBadge(type: string) {
  const map: Record<string, string> = {
    nfse: "NFS-e",
    nfe: "NF-e",
    nfce: "NFC-e",
  };
  return (
    <span className="inline-block rounded bg-marinha-900/10 px-2 py-0.5 text-xs font-bold text-marinha-700">
      {map[type] ?? type.toUpperCase()}
    </span>
  );
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    pending: "bg-marinha-500/10 text-marinha-600",
    processing: "bg-marinha-500/10 text-marinha-600",
    authorized: "bg-emerald-500/15 text-emerald-700",
    rejected: "bg-alerta-500/15 text-alerta-700",
    cancelled: "bg-amber-500/15 text-amber-700",
    error: "bg-red-500/15 text-red-700",
  };
  const labels: Record<string, string> = {
    pending: "Pendente",
    processing: "Processando",
    authorized: "Autorizada",
    rejected: "Rejeitada",
    cancelled: "Cancelada",
    error: "Erro",
  };
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${styles[status] ?? "bg-marinha-500/10 text-marinha-600"}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

const TAKE = 50;

export default function FiscalPage() {
  const businessId = useSelectedBusinessId();
  const [docs, setDocs] = useState<FiscalDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const authorizedCount = docs.filter((doc) => doc.status === "authorized").length;
  const pendingCount = docs.filter((doc) => doc.status === "pending" || doc.status === "processing").length;
  const rejectedCount = docs.filter((doc) => doc.status === "rejected" || doc.status === "error").length;

  const load = useCallback(async (skip = 0) => {
    if (!businessId) {
      setDocs([]);
      setTotal(0);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await erpFetch<{ items: FiscalDoc[]; total: number }>(
      `/api/v1/erp/fiscal?take=${TAKE}&skip=${skip}`,
    );
    setLoading(false);
    if (!res.ok || !res.data) {
      setError(res.error ?? "Não foi possível carregar os documentos fiscais.");
      return;
    }
    setDocs(res.data.items);
    setTotal(res.data.total);
  }, [businessId]);

  useEffect(() => { void load(); }, [load]);

  async function handleRefresh(id: string) {
    setRefreshingId(id);
    const res = await erpFetch<FiscalDoc>(`/api/v1/erp/fiscal/${id}/refresh`, { method: "PATCH" });
    setRefreshingId(null);
    if (res.ok && res.data) {
      setDocs((prev) => prev.map((d) => (d.id === id ? res.data! : d)));
    }
  }

  async function handleCancel(id: string) {
    if (!confirm("Cancelar esta nota fiscal? Esta ação não pode ser desfeita.")) return;
    setCancellingId(id);
    const res = await erpFetch<FiscalDoc>(`/api/v1/erp/fiscal/${id}`, { method: "DELETE" });
    setCancellingId(null);
    if (res.ok && res.data) {
      setDocs((prev) => prev.map((d) => (d.id === id ? res.data! : d)));
    }
  }

  return (
    <>
      <PageIntro
        title="Notas Fiscais"
        description="Centralize a emissão, o acompanhamento e os documentos fiscais da empresa em um único painel."
      >
        <div className="mt-3">
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            + Emitir nota fiscal
          </Button>
        </div>
      </PageIntro>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card variant="featured">
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Documentos</p>
          <p className="mt-2 text-lg font-bold text-marinha-900">{total}</p>
          <p className="mt-1 text-sm text-marinha-500">Notas registradas na central fiscal.</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Autorizadas</p>
          <p className="mt-2 text-lg font-bold text-marinha-900">{authorizedCount}</p>
          <p className="mt-1 text-sm text-marinha-500">Notas aprovadas e disponíveis para consulta.</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Em andamento</p>
          <p className="mt-2 text-lg font-bold text-marinha-900">{pendingCount}</p>
          <p className="mt-1 text-sm text-marinha-500">Documentos aguardando processamento ou retorno.</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Atenção</p>
          <p className="mt-2 text-lg font-bold text-marinha-900">{rejectedCount}</p>
          <p className="mt-1 text-sm text-marinha-500">Notas com rejeição ou erro para revisar.</p>
        </Card>
      </div>

      <Card className="mb-6 border border-marinha-900/8 bg-surface-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-lg text-marinha-900">Central de emissão</h2>
            <p className="mt-1 text-sm text-marinha-500">
              Emita novas notas, acompanhe o processamento e consulte os documentos gerados.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="accent">Fiscal</Badge>
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              Emitir nota fiscal
            </Button>
          </div>
        </div>
      </Card>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-card bg-marinha-900/5" />
          ))}
        </div>
      )}

      {!loading && error && (
        <Card>
          <p className="text-sm text-alerta-700">{error}</p>
          <Button variant="secondary" className="mt-3" onClick={() => void load()}>
            Tentar novamente
          </Button>
        </Card>
      )}

      {!loading && !error && docs.length === 0 && (
        <Card>
          <p className="text-sm text-marinha-500">
            Nenhuma nota emitida ainda. Assim que houver uma venda pronta para faturamento, use o botão
            <strong> Emitir nota fiscal</strong>.
          </p>
        </Card>
      )}

      {!loading && docs.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <div className="flex items-center justify-between gap-3 border-b border-marinha-900/8 px-4 py-4">
            <div>
              <h2 className="font-serif text-lg text-marinha-900">Histórico de notas</h2>
              <p className="mt-1 text-sm text-marinha-500">Consulte status, número, emissão e arquivos de cada documento.</p>
            </div>
            <Badge tone="neutral">Documentos</Badge>
          </div>
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-marinha-900/10 text-left text-xs font-semibold uppercase tracking-wide text-marinha-500">
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Pedido</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Número</th>
                <th className="px-4 py-3">Emissão</th>
                <th className="px-4 py-3">Docs</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.id} className="border-b border-marinha-900/5 last:border-0">
                  <td className="px-4 py-3">{typeBadge(doc.type)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-marinha-600">
                    {doc.salesOrder?.id.slice(0, 8) ?? "—"}
                  </td>
                  <td className="px-4 py-3">{statusBadge(doc.status)}</td>
                  <td className="px-4 py-3 text-marinha-700">
                    {doc.numero ? `${doc.numero}/${doc.serie ?? ""}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-marinha-500">
                    {doc.emittedAt
                      ? new Date(doc.emittedAt).toLocaleString("pt-BR")
                      : new Date(doc.createdAt).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {doc.pdfUrl && (
                        <a
                          href={doc.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-municipal-700 underline"
                        >
                          PDF
                        </a>
                      )}
                      {doc.xmlUrl && (
                        <a
                          href={doc.xmlUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-municipal-700 underline"
                        >
                          XML
                        </a>
                      )}
                      {!doc.pdfUrl && !doc.xmlUrl && (
                        <span className="text-xs text-marinha-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {doc.status !== "authorized" && doc.status !== "cancelled" && (
                        <button
                          onClick={() => void handleRefresh(doc.id)}
                          disabled={refreshingId === doc.id}
                          className="focus-ring rounded px-2 py-1 text-xs font-semibold text-municipal-700 hover:bg-municipal-600/10 disabled:opacity-50"
                        >
                          {refreshingId === doc.id ? "…" : "Atualizar"}
                        </button>
                      )}
                      {doc.status === "authorized" && (
                        <button
                          onClick={() => void handleCancel(doc.id)}
                          disabled={cancellingId === doc.id}
                          className="focus-ring rounded px-2 py-1 text-xs font-semibold text-alerta-700 hover:bg-alerta-500/10 disabled:opacity-50"
                        >
                          {cancellingId === doc.id ? "…" : "Cancelar"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {total > TAKE && (
            <p className="px-4 py-3 text-xs text-marinha-500">
              Exibindo {docs.length} de {total} documentos.
            </p>
          )}
        </Card>
      )}

      <ErpFiscalEmitModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          void load();
        }}
      />
    </>
  );
}
