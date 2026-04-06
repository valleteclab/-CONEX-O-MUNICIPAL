"use client";

import { useCallback, useEffect, useState } from "react";
import { ErpDataTable, type ErpColumn } from "@/components/erp/erp-data-table";
import { ErpFiscalEmitModal } from "@/components/erp/erp-fiscal-emit-modal";
import { ErpFormModal } from "@/components/erp/erp-form-modal";
import { PageIntro } from "@/components/layout/page-intro";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSelectedBusinessId } from "@/hooks/use-selected-business-id";
import { erpFetch } from "@/lib/api-browser";
import type { ErpListResponse } from "@/lib/erp-list";

type SalesOrder = {
  id: string;
  partyId: string | null;
  status: "draft" | "confirmed" | "cancelled";
  totalAmount: string;
  source: string;
  createdAt: string;
  party?: { name: string };
};

type Product = { id: string; name: string; sku: string; price: string };
type Party = { id: string; name: string; type: string };

type OrderLine = { productId: string; qty: string; unitPrice: string };

const TAKE = 50;

function fmt(v: string) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR");
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-marinha-100 text-marinha-600",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const SOURCE_LABEL: Record<string, string> = {
  erp: "ERP",
  portal_diretorio: "Diretório",
  portal_cotacoes: "Cotações",
};

export default function ErpPedidosVendaPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [skip, setSkip] = useState(0);

  const [products, setProducts] = useState<Product[]>([]);
  const [parties, setParties] = useState<Party[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [fiscalModalOrderId, setFiscalModalOrderId] = useState<string | null>(null);
  const [partyId, setPartyId] = useState("");
  const [lines, setLines] = useState<OrderLine[]>([{ productId: "", qty: "1", unitPrice: "0" }]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const businessId = useSelectedBusinessId();
  const noBusinessId = !businessId;

  const load = useCallback(
    async (reset = false) => {
      setIsLoading(true);
      setError(null);
      const currentSkip = reset ? 0 : skip;
      const res = await erpFetch<ErpListResponse<SalesOrder>>(
        `/api/v1/erp/sales-orders?take=${TAKE}&skip=${currentSkip}`,
      );
      if (res.ok && res.data) {
        const { items, total } = res.data;
        setOrders((prev) => (reset ? items : [...prev, ...items]));
        setSkip(currentSkip + items.length);
        setHasMore(currentSkip + items.length < total);
      } else {
        setError(res.error ?? "Erro ao carregar pedidos.");
      }
      setIsLoading(false);
    },
    [skip],
  );

  const loadSupport = useCallback(async () => {
    const [pRes, parRes] = await Promise.all([
      erpFetch<ErpListResponse<Product>>("/api/v1/erp/products?take=100&skip=0"),
      erpFetch<ErpListResponse<Party>>("/api/v1/erp/parties?take=100&skip=0"),
    ]);
    if (pRes.ok && pRes.data) setProducts(pRes.data.items);
    if (parRes.ok && parRes.data)
      setParties(parRes.data.items.filter((p) => p.type !== "supplier"));
  }, []);

  useEffect(() => {
    if (noBusinessId) {
      setOrders([]);
      setProducts([]);
      setParties([]);
      setHasMore(false);
      setSkip(0);
      return;
    }
    load(true);
    loadSupport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const patchStatus = async (id: string, status: "confirmed" | "cancelled") => {
    const res = await erpFetch(`/api/v1/erp/sales-orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    }
  };

  const addLine = () =>
    setLines((ls) => [...ls, { productId: "", qty: "1", unitPrice: "0" }]);

  const removeLine = (i: number) => setLines((ls) => ls.filter((_, idx) => idx !== i));

  const updateLine = (i: number, key: keyof OrderLine, value: string) => {
    setLines((ls) =>
      ls.map((l, idx) => {
        if (idx !== i) return l;
        const updated = { ...l, [key]: value };
        if (key === "productId") {
          const p = products.find((pr) => pr.id === value);
          if (p) updated.unitPrice = p.price;
        }
        return updated;
      }),
    );
  };

  const lineTotal = lines.reduce(
    (sum, l) => sum + Number(l.qty || 0) * Number(l.unitPrice || 0),
    0,
  );

  const openModal = () => {
    setPartyId("");
    setLines([{ productId: "", qty: "1", unitPrice: "0" }]);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const validLines = lines.filter((l) => l.productId && Number(l.qty) > 0);
    if (validLines.length === 0) {
      setFormError("Adicione pelo menos um item com produto e quantidade.");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    const res = await erpFetch<SalesOrder>("/api/v1/erp/sales-orders", {
      method: "POST",
      body: JSON.stringify({
        ...(partyId ? { partyId } : {}),
        items: validLines.map((l) => ({
          productId: l.productId,
          qty: l.qty,
          unitPrice: l.unitPrice,
        })),
      }),
    });
    if (res.ok && res.data) {
      setOrders((prev) => [res.data!, ...prev]);
      setModalOpen(false);
    } else {
      setFormError(res.error ?? "Erro ao criar pedido.");
    }
    setIsSubmitting(false);
  };

  const columns: ErpColumn<SalesOrder>[] = [
    { key: "id", label: "Nº", render: (r) => <span className="font-mono text-xs">{shortId(r.id)}</span> },
    {
      key: "source",
      label: "Origem",
      render: (r) => (
        <span className="rounded-full bg-marinha-100 px-2 py-0.5 text-xs text-marinha-600">
          {SOURCE_LABEL[r.source] ?? r.source}
        </span>
      ),
    },
    { key: "party", label: "Cliente", render: (r) => r.party?.name ?? "—" },
    { key: "createdAt", label: "Data", render: (r) => fmtDate(r.createdAt) },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[r.status]}`}>
          {STATUS_LABEL[r.status]}
        </span>
      ),
    },
    { key: "total", label: "Total", render: (r) => fmt(r.totalAmount) },
    {
      key: "actions",
      label: "",
      render: (r) =>
        r.status === "draft" ? (
          <div className="flex gap-2">
            <button
              onClick={() => patchStatus(r.id, "confirmed")}
              className="rounded-btn bg-green-600 px-2 py-1 text-xs font-semibold text-white hover:bg-green-700"
            >
              Confirmar
            </button>
            <button
              onClick={() => patchStatus(r.id, "cancelled")}
              className="rounded-btn border border-red-300 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
            >
              Cancelar
            </button>
          </div>
        ) : r.status === "confirmed" ? (
          <button
            onClick={() => setFiscalModalOrderId(r.id)}
            className="rounded-btn border border-municipal-600/40 px-2 py-1 text-xs font-semibold text-municipal-700 hover:bg-municipal-600/10"
          >
            Emitir NF
          </button>
        ) : null,
    },
  ];

  return (
    <>
      <PageIntro
        title="Pedidos de venda"
        description="Inclui pedidos criados no ERP e solicitações vindas do diretório, com origem identificável."
        badge="Vendas"
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <Button variant="primary" onClick={openModal} disabled={noBusinessId}>
          Novo pedido
        </Button>
      </div>
      <Card>
        <ErpDataTable
          columns={columns}
          data={orders}
          isLoading={isLoading}
          error={error}
          emptyMessage="Nenhum pedido de venda ainda."
          onRetry={() => load(true)}
          keyExtractor={(r) => r.id}
          hasMore={hasMore}
          onLoadMore={() => load(false)}
        />
      </Card>

      <ErpFiscalEmitModal
        open={fiscalModalOrderId !== null}
        preSelectedOrderId={fiscalModalOrderId}
        onClose={() => setFiscalModalOrderId(null)}
        onSuccess={() => setFiscalModalOrderId(null)}
      />

      <ErpFormModal
        title="Novo pedido de venda"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Criar pedido"
      >
        <div className="mb-4 flex flex-col gap-1">
          <label className="text-xs font-medium text-marinha-700">Cliente (opcional)</label>
          <select
            value={partyId}
            onChange={(e) => setPartyId(e.target.value)}
            className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
          >
            <option value="">— Sem cliente —</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-2 text-xs font-semibold text-marinha-700">Itens *</div>
        <div className="mb-3 flex flex-col gap-2">
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-[1fr_80px_100px_auto] items-end gap-2">
              <select
                value={line.productId}
                onChange={(e) => updateLine(i, "productId", e.target.value)}
                className="rounded-btn border border-marinha-900/20 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
              >
                <option value="">— Produto —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {p.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0.001"
                step="0.001"
                placeholder="Qtd"
                value={line.qty}
                onChange={(e) => updateLine(i, "qty", e.target.value)}
                className="rounded-btn border border-marinha-900/20 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Preço unit."
                value={line.unitPrice}
                onChange={(e) => updateLine(i, "unitPrice", e.target.value)}
                className="rounded-btn border border-marinha-900/20 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
              />
              <button
                type="button"
                onClick={() => removeLine(i)}
                disabled={lines.length === 1}
                className="rounded-btn p-2 text-marinha-400 hover:text-red-600 disabled:opacity-30"
                aria-label="Remover linha"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={addLine}
            className="text-sm text-municipal-700 hover:underline"
          >
            + Adicionar item
          </button>
          <span className="text-sm font-semibold text-marinha-800">
            Total: {fmt(String(lineTotal))}
          </span>
        </div>

        {formError && <p className="text-sm text-red-600">{formError}</p>}
      </ErpFormModal>
    </>
  );
}
