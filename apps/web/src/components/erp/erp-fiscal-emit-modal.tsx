"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { erpFetch } from "@/lib/api-browser";

type SalesOrder = {
  id: string;
  status: "draft" | "confirmed" | "cancelled";
  totalAmount: string;
  createdAt: string;
  party?: { name: string } | null;
};

type FiscalDoc = {
  id: string;
  type: string;
  status: string;
  numero: string | null;
  pdfUrl: string | null;
  xmlUrl: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preSelectedOrderId?: string | null;
};

function fmt(v: string) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function statusLabel(s: string) {
  switch (s) {
    case "authorized": return "Autorizada";
    case "processing": return "Processando";
    case "rejected": return "Rejeitada";
    case "cancelled": return "Cancelada";
    case "error": return "Erro";
    default: return s;
  }
}

export function ErpFiscalEmitModal({ open, onClose, onSuccess, preSelectedOrderId }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderId, setOrderId] = useState(preSelectedOrderId ?? "");
  const [type, setType] = useState<"nfse" | "nfe">("nfse");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FiscalDoc | null>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      el.showModal();
    } else {
      el.close();
    }
  }, [open]);

  useEffect(() => {
    if (preSelectedOrderId) setOrderId(preSelectedOrderId);
  }, [preSelectedOrderId]);

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    const res = await erpFetch<{ items: SalesOrder[] }>("/api/v1/erp/sales-orders?take=100&skip=0");
    setLoadingOrders(false);
    if (res.ok && res.data) {
      setOrders(res.data.items.filter((o) => o.status === "confirmed"));
    }
  }, []);

  useEffect(() => {
    if (open && orders.length === 0) {
      void loadOrders();
    }
  }, [open, orders.length, loadOrders]);

  function handleClose() {
    setError(null);
    setResult(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderId) { setError("Selecione um pedido."); return; }
    setError(null);
    setSubmitting(true);
    const res = await erpFetch<FiscalDoc>("/api/v1/erp/fiscal/emit", {
      method: "POST",
      body: JSON.stringify({ orderId, type }),
    });
    setSubmitting(false);
    if (!res.ok || !res.data) {
      setError(res.error ?? "Falha ao emitir nota fiscal.");
      return;
    }
    setResult(res.data);
    onSuccess();
  }

  return (
    <dialog
      ref={dialogRef}
      className="w-full max-w-lg rounded-card bg-white p-0 shadow-xl backdrop:bg-black/40"
      onClose={handleClose}
    >
      <form onSubmit={handleSubmit}>
        <div className="border-b border-marinha-900/10 px-6 py-4">
          <h2 className="font-serif text-lg font-bold text-marinha-900">Emitir Nota Fiscal</h2>
          <p className="mt-0.5 text-xs text-marinha-500">
            Ambiente sandbox (homologação) — nenhuma nota real será gerada.
          </p>
        </div>

        <div className="space-y-4 px-6 py-5">
          {error ? (
            <p className="rounded-btn border border-alerta-500/30 bg-alerta-500/10 px-3 py-2 text-sm text-alerta-600">
              {error}
            </p>
          ) : null}

          {result ? (
            <div className="space-y-3 rounded-btn border border-municipal-600/30 bg-municipal-600/5 px-4 py-3">
              <p className="text-sm font-semibold text-municipal-800">
                Nota enviada ao PlugNotas — {statusLabel(result.status)}
              </p>
              {result.numero && (
                <p className="text-xs text-marinha-600">Número: {result.numero}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {result.pdfUrl && (
                  <a
                    href={result.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-municipal-700 underline"
                  >
                    Baixar PDF
                  </a>
                )}
                {result.xmlUrl && (
                  <a
                    href={result.xmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-municipal-700 underline"
                  >
                    Baixar XML
                  </a>
                )}
                {!result.pdfUrl && !result.xmlUrl && (
                  <p className="text-xs text-marinha-500">
                    Nota em processamento — atualize o status em &quot;Notas Fiscais&quot; em breve.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-marinha-700">
                  Pedido de venda (confirmado)
                </label>
                {loadingOrders ? (
                  <div className="h-10 animate-pulse rounded-btn bg-marinha-900/10" />
                ) : (
                  <select
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    required
                    className="focus-ring min-h-[44px] w-full rounded-btn border-2 border-marinha-900/25 bg-white px-3 py-2 text-sm text-marinha-900"
                  >
                    <option value="">Selecione um pedido…</option>
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.id.slice(0, 8)} — {o.party?.name ?? "Consumidor Final"} —{" "}
                        {fmt(o.totalAmount)}
                      </option>
                    ))}
                  </select>
                )}
                {orders.length === 0 && !loadingOrders && (
                  <p className="mt-1 text-xs text-marinha-500">
                    Nenhum pedido confirmado encontrado. Confirme um pedido antes de emitir.
                  </p>
                )}
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-marinha-700">Tipo de nota</p>
                <div className="flex gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="type"
                      value="nfse"
                      checked={type === "nfse"}
                      onChange={() => setType("nfse")}
                      className="focus-ring h-4 w-4 text-municipal-600"
                    />
                    <span>NFS-e (Serviço)</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="type"
                      value="nfe"
                      checked={type === "nfe"}
                      onChange={() => setType("nfe")}
                      className="focus-ring h-4 w-4 text-municipal-600"
                    />
                    <span>NF-e (Produto)</span>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-marinha-900/10 px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            className="focus-ring inline-flex min-h-[40px] items-center rounded-btn border-2 border-marinha-900/20 bg-white px-4 text-sm font-semibold text-marinha-700 hover:bg-surface"
          >
            {result ? "Fechar" : "Cancelar"}
          </button>
          {!result && (
            <Button variant="primary" type="submit" disabled={submitting || loadingOrders}>
              {submitting ? "Emitindo…" : "Emitir nota"}
            </Button>
          )}
        </div>
      </form>
    </dialog>
  );
}
