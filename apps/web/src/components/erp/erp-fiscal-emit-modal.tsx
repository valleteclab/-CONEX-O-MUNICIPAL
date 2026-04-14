"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { erpFetch } from "@/lib/api-browser";

type FiscalType = "nfse" | "nfe" | "nfce";
type PaymentMethod = "cash" | "credit_card" | "debit_card" | "pix" | "other";

type SalesOrder = {
  id: string;
  status: "draft" | "confirmed" | "cancelled";
  totalAmount: string;
  createdAt: string;
  source?: string;
  party?: { name: string } | null;
};

type FiscalDoc = {
  id: string;
  type: FiscalType;
  status: string;
  numero: string | null;
  pdfUrl: string | null;
  xmlUrl: string | null;
};

type FiscalReadiness = {
  type: FiscalType;
  sandbox: boolean;
  ready: boolean;
  checks: Array<{ id: string; ok: boolean; message: string }>;
  productionNotes: string[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: (doc: FiscalDoc) => void;
  preSelectedOrderId?: string | null;
  preSelectedType?: FiscalType;
  preSelectedPaymentMethod?: PaymentMethod;
};

const PAYMENT_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "credit_card", label: "Cartao de credito" },
  { value: "debit_card", label: "Cartao de debito" },
  { value: "other", label: "Outro" },
];

function fmt(value: string) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function statusLabel(status: string) {
  switch (status) {
    case "authorized":
      return "Autorizada";
    case "processing":
      return "Processando";
    case "rejected":
      return "Rejeitada";
    case "cancelled":
      return "Cancelada";
    case "error":
      return "Erro";
    default:
      return status;
  }
}

function typeLabel(type: FiscalType) {
  switch (type) {
    case "nfse":
      return "NFS-e";
    case "nfe":
      return "NF-e";
    case "nfce":
      return "NFC-e";
    default:
      return type;
  }
}

export function ErpFiscalEmitModal({
  open,
  onClose,
  onSuccess,
  preSelectedOrderId,
  preSelectedType = "nfse",
  preSelectedPaymentMethod = "cash",
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderId, setOrderId] = useState(preSelectedOrderId ?? "");
  const [type, setType] = useState<FiscalType>(preSelectedType);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>(preSelectedPaymentMethod);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FiscalDoc | null>(null);
  const [readiness, setReadiness] = useState<FiscalReadiness | null>(null);
  const [loadingReadiness, setLoadingReadiness] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setType(preSelectedType);
      setPaymentMethod(preSelectedPaymentMethod);
      setOrderId(preSelectedOrderId ?? "");
      setError(null);
      setResult(null);
    }
  }, [open, preSelectedOrderId, preSelectedPaymentMethod, preSelectedType]);

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    const res = await erpFetch<{ items: SalesOrder[] }>(
      "/api/v1/erp/sales-orders?take=100&skip=0",
    );
    setLoadingOrders(false);
    if (!res.ok || !res.data) return;
    setOrders(res.data.items.filter((order) => order.status === "confirmed"));
  }, []);

  const loadReadiness = useCallback(async (nextType: FiscalType) => {
    setLoadingReadiness(true);
    const res = await erpFetch<FiscalReadiness>(
      `/api/v1/erp/fiscal/readiness?type=${nextType}`,
    );
    setLoadingReadiness(false);
    if (res.ok && res.data) {
      setReadiness(res.data);
    }
  }, []);

  useEffect(() => {
    if (!open || orders.length > 0) return;
    void loadOrders();
  }, [loadOrders, open, orders.length]);

  useEffect(() => {
    if (!open) return;
    void loadReadiness(type);
  }, [loadReadiness, open, type]);

  function handleClose() {
    setError(null);
    setResult(null);
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!orderId) {
      setError("Selecione um pedido confirmado.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await erpFetch<FiscalDoc>("/api/v1/erp/fiscal/emit", {
      method: "POST",
      body: JSON.stringify({
        orderId,
        type,
        ...(type === "nfce" ? { paymentMethod } : {}),
      }),
    });

    setSubmitting(false);
    if (!res.ok || !res.data) {
      setError(res.error ?? "Falha ao emitir documento fiscal.");
      return;
    }

    setResult(res.data);
    onSuccess?.(res.data);
  }

  return (
    <dialog
      ref={dialogRef}
      className="m-auto h-[min(92vh,980px)] w-[min(96vw,1320px)] max-w-[min(96vw,1240px)] overflow-hidden rounded-[32px] border border-marinha-900/10 bg-white p-0 shadow-2xl backdrop:bg-marinha-950/45"
      onClose={handleClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) handleClose();
      }}
    >
      <form onSubmit={handleSubmit} className="flex h-full flex-col bg-gradient-to-b from-white via-white to-slate-50/70">
        <div className="border-b border-marinha-900/10 px-6 py-5 md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-marinha-500">Central fiscal</p>
          <h2 className="mt-2 font-serif text-xl font-bold text-marinha-900 md:text-2xl">Emitir documento fiscal</h2>
          <p className="mt-1 text-sm text-marinha-500">
            {readiness?.sandbox
              ? "Ambiente sandbox PlugNotas: os retornos sao de homologacao."
              : "Ambiente de producao: confirme certificado, emitente e webhooks antes de emitir."}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 md:px-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
            <div className="space-y-4">
              {error && (
                <div className="rounded-3xl border border-alerta-500/30 bg-alerta-500/10 px-4 py-4 text-sm text-alerta-700">
                  <p className="whitespace-pre-line leading-relaxed">{error}</p>
                  <p className="mt-3 text-xs">
                    <Link href="/erp/dados-fiscais" className="font-semibold underline">
                      Abrir dados fiscais do negocio
                    </Link>
                  </p>
                </div>
              )}

              {result ? (
                <div className="space-y-3 rounded-3xl border border-municipal-600/30 bg-municipal-600/5 px-5 py-5">
                  <p className="text-sm font-semibold text-municipal-800">
                    {typeLabel(result.type)} enviada ao PlugNotas: {statusLabel(result.status)}
                  </p>
                  {result.numero ? <p className="text-xs text-marinha-600">Numero: {result.numero}</p> : null}
                  <div className="flex flex-wrap gap-3">
                    {result.pdfUrl ? (
                      <a
                        href={result.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-municipal-700 underline"
                      >
                        Baixar PDF
                      </a>
                    ) : null}
                    {result.xmlUrl ? (
                      <a
                        href={result.xmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-municipal-700 underline"
                      >
                        Baixar XML
                      </a>
                    ) : null}
                    {!result.pdfUrl && !result.xmlUrl ? (
                      <p className="text-xs text-marinha-500">
                        O documento foi aceito para processamento. Atualize o status na Central Fiscal em instantes.
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <>
                  <div className="rounded-3xl border border-marinha-900/10 bg-white p-5">
                    <label className="mb-1 block text-sm font-medium text-marinha-700">Pedido confirmado</label>
                    {loadingOrders ? (
                      <div className="h-12 animate-pulse rounded-btn bg-marinha-900/10" />
                    ) : (
                      <select
                        value={orderId}
                        onChange={(event) => setOrderId(event.target.value)}
                        required
                        className="focus-ring min-h-[48px] w-full rounded-btn border-2 border-marinha-900/25 bg-white px-4 py-3 text-sm text-marinha-900"
                      >
                        <option value="">Selecione um pedido...</option>
                        {orders.map((order) => (
                          <option key={order.id} value={order.id}>
                            {order.id.slice(0, 8)} - {order.party?.name ?? "Consumidor final"} - {fmt(order.totalAmount)}
                          </option>
                        ))}
                      </select>
                    )}
                    {!loadingOrders && orders.length === 0 ? (
                      <p className="mt-1 text-xs text-marinha-500">
                        Nenhum pedido confirmado encontrado. Confirme uma venda antes de emitir.
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-3xl border border-marinha-900/10 bg-white p-5">
                    <p className="mb-3 text-sm font-medium text-marinha-700">Tipo de documento</p>
                    <div className="flex flex-wrap gap-3">
                      {(["nfse", "nfe", "nfce"] as FiscalType[]).map((option) => (
                        <label
                          key={option}
                          className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                            type === option
                              ? "border-municipal-600 bg-municipal-600/10 text-municipal-700"
                              : "border-marinha-900/10 bg-slate-50 text-marinha-700"
                          }`}
                        >
                          <input
                            type="radio"
                            name="type"
                            value={option}
                            checked={type === option}
                            onChange={() => setType(option)}
                            className="focus-ring h-4 w-4 text-municipal-600"
                          />
                          <span>{typeLabel(option)}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {type === "nfce" ? (
                    <div className="rounded-3xl border border-marinha-900/10 bg-white p-5">
                      <label className="mb-1 block text-sm font-medium text-marinha-700">Forma de pagamento</label>
                      <select
                        value={paymentMethod}
                        onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                        className="focus-ring min-h-[48px] w-full rounded-btn border-2 border-marinha-900/25 bg-white px-4 py-3 text-sm text-marinha-900"
                      >
                        {PAYMENT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-marinha-500">
                        A NFC-e exige informar o meio de pagamento do cupom.
                      </p>
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-marinha-900/10 bg-marinha-950 p-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Prontidao fiscal</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">Checklist do emitente</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      readiness?.ready ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {loadingReadiness ? "Atualizando..." : readiness?.ready ? "Pronto" : "Revisar cadastro"}
                  </span>
                </div>

                {readiness?.checks?.length ? (
                  <ul className="mt-4 space-y-2">
                    {readiness.checks.map((check) => (
                      <li
                        key={check.id}
                        className={`rounded-2xl px-3 py-3 text-xs ${
                          check.ok ? "bg-green-50 text-green-900" : "bg-amber-50 text-amber-900"
                        }`}
                      >
                        {check.ok ? "OK" : "Pendente"}: {check.message}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-xs text-white/70">Carregando validacoes do emitente...</p>
                )}
              </div>

              {readiness?.productionNotes?.length ? (
                <div className="rounded-3xl border border-marinha-900/10 bg-slate-50/70 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-marinha-600">Orientacoes</p>
                  <ul className="mt-3 space-y-2 text-sm text-marinha-600">
                    {readiness.productionNotes.map((note) => (
                      <li key={note}>- {note}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-marinha-900/10 bg-white/90 px-6 py-4 backdrop-blur sm:flex-row sm:justify-end md:px-8">
          <button
            type="button"
            onClick={handleClose}
            className="focus-ring inline-flex min-h-[48px] items-center justify-center rounded-btn border-2 border-marinha-900/20 bg-white px-5 text-sm font-semibold text-marinha-700 hover:bg-surface"
          >
            {result ? "Fechar" : "Cancelar"}
          </button>
          {!result ? (
            <Button variant="primary" type="submit" disabled={submitting || loadingOrders}>
              {submitting ? "Emitindo..." : "Emitir documento"}
            </Button>
          ) : null}
        </div>
      </form>
    </dialog>
  );
}
