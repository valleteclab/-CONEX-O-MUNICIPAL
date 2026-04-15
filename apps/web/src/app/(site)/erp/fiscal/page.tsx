"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
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
  purpose: "sale" | "return";
  status: "pending" | "processing" | "authorized" | "rejected" | "cancelled" | "error";
  numero: string | null;
  serie: string | null;
  pdfUrl: string | null;
  xmlUrl: string | null;
  emittedAt: string | null;
  createdAt: string;
  relatedDocument?: { id: string; numero: string | null } | null;
  salesOrder?: { id: string; totalAmount: string } | null;
};

// ─── Helpers de badge ────────────────────────────────────────────────────────

function typeBadge(type: string) {
  const map: Record<string, string> = { nfse: "NFS-e", nfe: "NF-e", nfce: "NFC-e" };
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
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${styles[status] ?? "bg-marinha-500/10 text-marinha-600"}`}>
      {labels[status] ?? status}
    </span>
  );
}

function purposeBadge(purpose: FiscalDoc["purpose"]) {
  return (
    <span className="inline-block rounded bg-municipal-600/10 px-2 py-0.5 text-xs font-semibold text-municipal-700">
      {purpose === "return" ? "Devolução" : "Venda"}
    </span>
  );
}

// ─── Modal de cancelamento ────────────────────────────────────────────────────

function CancelModal({
  doc,
  onClose,
  onSuccess,
}: {
  doc: FiscalDoc;
  onClose: () => void;
  onSuccess: (updated: FiscalDoc) => void;
}) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  async function handleConfirm() {
    if (!reason.trim()) {
      setError("Informe o motivo do cancelamento.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await erpFetch<FiscalDoc>(`/api/v1/erp/fiscal/${doc.id}`, {
      method: "DELETE",
      body: JSON.stringify({ reason: reason.trim() }),
    });
    setLoading(false);
    if (res.ok && res.data) {
      onSuccess(res.data);
    } else {
      setError(res.error ?? "Não foi possível cancelar a nota fiscal.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-card bg-white shadow-xl">
        <div className="border-b border-marinha-900/10 px-6 py-4">
          <h2 className="font-serif text-lg text-marinha-900">Cancelar nota fiscal</h2>
          <p className="mt-1 text-sm text-marinha-500">
            Esta ação é irreversível e depende da confirmação da SEFAZ.{" "}
            {doc.type === "nfe" || doc.type === "nfce"
              ? "Notas NF-e e NFC-e só podem ser canceladas em até 24h após a autorização."
              : "NFS-e pode ser cancelada conforme prazo do município."}
          </p>
        </div>
        <div className="px-6 py-4">
          <label className="block text-sm font-semibold text-marinha-700">
            Motivo do cancelamento
          </label>
          <textarea
            ref={textareaRef}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Descreva o motivo (obrigatório pela SEFAZ)"
            className="mt-2 w-full rounded-input border border-marinha-900/20 bg-surface-input px-3 py-2 text-sm text-marinha-900 placeholder:text-marinha-400 focus:outline-none focus:ring-2 focus:ring-municipal-500"
          />
          <p className="mt-1 text-right text-xs text-marinha-400">{reason.length}/500</p>
          {error && <p className="mt-2 text-sm text-alerta-700">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 border-t border-marinha-900/10 px-6 py-4">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Voltar
          </Button>
          <Button
            variant="primary"
            onClick={() => void handleConfirm()}
            disabled={loading || !reason.trim()}
            className="bg-alerta-700 hover:bg-alerta-800"
          >
            {loading ? "Cancelando…" : "Confirmar cancelamento"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de CC-e ────────────────────────────────────────────────────────────

function CceModal({
  doc,
  onClose,
  onSuccess,
}: {
  doc: FiscalDoc;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [correcao, setCorrecao] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  async function handleConfirm() {
    if (correcao.trim().length < 15) {
      setError("O texto deve ter pelo menos 15 caracteres (exigência da SEFAZ).");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await erpFetch<unknown>(`/api/v1/erp/fiscal/${doc.id}/cce`, {
      method: "POST",
      body: JSON.stringify({ correcao: correcao.trim() }),
    });
    setLoading(false);
    if (res.ok) {
      onSuccess();
    } else {
      setError(res.error ?? "Não foi possível enviar a carta de correção.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-card bg-white shadow-xl">
        <div className="border-b border-marinha-900/10 px-6 py-4">
          <h2 className="font-serif text-lg text-marinha-900">Carta de Correção Eletrônica (CC-e)</h2>
          <p className="mt-1 text-sm text-marinha-500">
            Permite corrigir informações auxiliares de uma NF-e já autorizada. Exclusivo para NF-e.
          </p>
        </div>

        <div className="px-6 py-4">
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-semibold">O que pode ser corrigido pela CC-e:</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs">
              <li>Dados do emitente ou destinatário (exceto CNPJ/CPF e IE)</li>
              <li>Descrição complementar de itens</li>
              <li>Informações adicionais e observações</li>
            </ul>
            <p className="mt-2 font-semibold">O que NÃO pode ser corrigido:</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs">
              <li>Valores, quantidades ou base de cálculo</li>
              <li>CNPJ/CPF do emitente ou destinatário</li>
              <li>Data de emissão, natureza da operação, CFOP</li>
            </ul>
            <p className="mt-2 text-xs">
              Se a correção envolver itens não permitidos, cancele e emita uma nota de substituição.
            </p>
          </div>

          <label className="block text-sm font-semibold text-marinha-700">
            Texto da correção
          </label>
          <textarea
            ref={textareaRef}
            value={correcao}
            onChange={(e) => setCorrecao(e.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="Descreva a correção (mínimo 15 caracteres)"
            className="mt-2 w-full rounded-input border border-marinha-900/20 bg-surface-input px-3 py-2 text-sm text-marinha-900 placeholder:text-marinha-400 focus:outline-none focus:ring-2 focus:ring-municipal-500"
          />
          <p className="mt-1 flex justify-between text-xs text-marinha-400">
            <span className={correcao.trim().length < 15 ? "text-alerta-700" : ""}>
              {correcao.trim().length < 15
                ? `Mínimo 15 caracteres (faltam ${15 - correcao.trim().length})`
                : "Texto válido"}
            </span>
            <span>{correcao.length}/1000</span>
          </p>
          {error && <p className="mt-2 text-sm text-alerta-700">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t border-marinha-900/10 px-6 py-4">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Voltar
          </Button>
          <Button
            variant="primary"
            onClick={() => void handleConfirm()}
            disabled={loading || correcao.trim().length < 15}
          >
            {loading ? "Enviando…" : "Enviar correção"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

const TAKE = 50;

type ActiveModal =
  | { kind: "cancel"; doc: FiscalDoc }
  | { kind: "cce"; doc: FiscalDoc }
  | { kind: "emit"; salesOrderId?: string }
  | null;

export default function FiscalPage() {
  const businessId = useSelectedBusinessId();
  const [docs, setDocs] = useState<FiscalDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const authorizedCount = docs.filter((d) => d.status === "authorized").length;
  const pendingCount = docs.filter((d) => d.status === "pending" || d.status === "processing").length;
  const rejectedCount = docs.filter((d) => d.status === "rejected" || d.status === "error").length;

  const load = useCallback(
    async (skip = 0) => {
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
    },
    [businessId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  }

  async function handleRefresh(id: string) {
    setRefreshingId(id);
    const res = await erpFetch<FiscalDoc>(`/api/v1/erp/fiscal/${id}/refresh`, { method: "PATCH" });
    setRefreshingId(null);
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
          <Button variant="primary" onClick={() => setActiveModal({ kind: "emit" })}>
            + Emitir nota fiscal
          </Button>
        </div>
      </PageIntro>

      {/* Cards de resumo */}
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

      {/* Banner de sucesso */}
      {successMsg && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {successMsg}
        </div>
      )}

      {/* Card de emissão */}
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
            <Button variant="primary" onClick={() => setActiveModal({ kind: "emit" })}>
              Emitir nota fiscal
            </Button>
          </div>
        </div>
      </Card>

      {/* Estados de carregamento / erro / vazio */}
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
            Nenhuma nota emitida ainda. Assim que houver uma venda pronta para faturamento, use o botão{" "}
            <strong>Emitir nota fiscal</strong>.
          </p>
        </Card>
      )}

      {/* Tabela de documentos */}
      {!loading && docs.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <div className="flex items-center justify-between gap-3 border-b border-marinha-900/8 px-4 py-4">
            <div>
              <h2 className="font-serif text-lg text-marinha-900">Histórico de notas</h2>
              <p className="mt-1 text-sm text-marinha-500">
                Consulte status, número, emissão e arquivos de cada documento.
              </p>
            </div>
            <Badge tone="neutral">Documentos</Badge>
          </div>

          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-marinha-900/10 text-left text-xs font-semibold uppercase tracking-wide text-marinha-500">
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Finalidade</th>
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
                  <td className="px-4 py-3">{purposeBadge(doc.purpose)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-marinha-600">
                    {doc.salesOrder?.id.slice(0, 8) ?? "—"}
                  </td>
                  <td className="px-4 py-3">{statusBadge(doc.status)}</td>
                  <td className="px-4 py-3 text-marinha-700">
                    {doc.numero ? `${doc.numero}/${doc.serie ?? ""}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-marinha-500">
                    {new Date(doc.emittedAt ?? doc.createdAt).toLocaleString("pt-BR")}
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

                  {/* Coluna de ações */}
                  <td className="px-4 py-3">
                    <ActionMenu
                      doc={doc}
                      refreshingId={refreshingId}
                      onRefresh={() => void handleRefresh(doc.id)}
                      onCancel={() => setActiveModal({ kind: "cancel", doc })}
                      onCce={() => setActiveModal({ kind: "cce", doc })}
                      onSubstitute={() =>
                        setActiveModal({ kind: "emit", salesOrderId: doc.salesOrder?.id })
                      }
                    />
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

      {/* Modais */}
      {activeModal?.kind === "cancel" && (
        <CancelModal
          doc={activeModal.doc}
          onClose={() => setActiveModal(null)}
          onSuccess={(updated) => {
            setDocs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
            setActiveModal(null);
            showSuccess("Nota fiscal cancelada com sucesso.");
          }}
        />
      )}

      {activeModal?.kind === "cce" && (
        <CceModal
          doc={activeModal.doc}
          onClose={() => setActiveModal(null)}
          onSuccess={() => {
            setActiveModal(null);
            showSuccess("Carta de Correção enviada com sucesso.");
          }}
        />
      )}

      {activeModal?.kind === "emit" && (
        <ErpFiscalEmitModal
          open
          onClose={() => setActiveModal(null)}
          onSuccess={() => {
            setActiveModal(null);
            void load();
          }}
          preSelectedOrderId={activeModal.salesOrderId}
        />
      )}
    </>
  );
}

// ─── Menu de ações por linha ──────────────────────────────────────────────────

function ActionMenu({
  doc,
  refreshingId,
  onRefresh,
  onCancel,
  onCce,
  onSubstitute,
}: {
  doc: FiscalDoc;
  refreshingId: string | null;
  onRefresh: () => void;
  onCancel: () => void;
  onCce: () => void;
  onSubstitute: () => void;
}) {
  const canCancel = doc.status === "authorized" && doc.purpose === "sale";
  // CC-e: apenas NF-e autorizada. NFC-e e NFS-e não têm CC-e.
  const canCce = doc.status === "authorized" && doc.type === "nfe";
  // Devolução: NF-e ou NFC-e autorizadas de venda
  const canReturn =
    doc.status === "authorized" &&
    doc.purpose === "sale" &&
    (doc.type === "nfe" || doc.type === "nfce") &&
    !!doc.salesOrder?.id;
  // Substituir: doc cancelado/rejeitado com pedido associado → re-emite para o mesmo pedido
  const canSubstitute =
    (doc.status === "cancelled" || doc.status === "rejected" || doc.status === "error") &&
    !!doc.salesOrder?.id;
  // Atualizar: docs em trânsito
  const canRefresh = doc.status === "pending" || doc.status === "processing";

  return (
    <div className="flex flex-wrap gap-2">
      {canRefresh && (
        <button
          onClick={onRefresh}
          disabled={refreshingId === doc.id}
          title="Consultar status atual no PlugNotas"
          className="focus-ring rounded px-2 py-1 text-xs font-semibold text-municipal-700 hover:bg-municipal-600/10 disabled:opacity-50"
        >
          {refreshingId === doc.id ? "…" : "Atualizar"}
        </button>
      )}

      {canCce && (
        <button
          onClick={onCce}
          title="Enviar Carta de Correção Eletrônica (CC-e) — apenas NF-e"
          className="focus-ring rounded px-2 py-1 text-xs font-semibold text-marinha-700 hover:bg-marinha-900/8"
        >
          Carta de correção
        </button>
      )}

      {canReturn && (
        <Link
          href={`/erp/pedidos-venda?focus=${doc.salesOrder!.id}`}
          title="Emitir nota de devolução para este pedido"
          className="focus-ring rounded px-2 py-1 text-xs font-semibold text-marinha-700 hover:bg-marinha-900/8"
        >
          Devolução
        </Link>
      )}

      {canSubstitute && (
        <button
          onClick={onSubstitute}
          title="Re-emitir nota para o mesmo pedido (substituição)"
          className="focus-ring rounded px-2 py-1 text-xs font-semibold text-municipal-700 hover:bg-municipal-600/10"
        >
          Substituir
        </button>
      )}

      {canCancel && (
        <button
          onClick={onCancel}
          title="Cancelar nota autorizada"
          className="focus-ring rounded px-2 py-1 text-xs font-semibold text-alerta-700 hover:bg-alerta-500/10"
        >
          Cancelar
        </button>
      )}
    </div>
  );
}
