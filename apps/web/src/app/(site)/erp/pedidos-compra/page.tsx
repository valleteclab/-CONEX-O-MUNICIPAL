"use client";

import { useCallback, useEffect, useState } from "react";
import { ErpDataTable, type ErpColumn } from "@/components/erp/erp-data-table";
import { ErpFormModal } from "@/components/erp/erp-form-modal";
import { PageIntro } from "@/components/layout/page-intro";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { erpFetch } from "@/lib/api-browser";
import { getBusinessId } from "@/lib/auth-storage";

type PurchaseOrder = {
  id: string;
  supplierPartyId: string;
  status: "draft" | "confirmed" | "received" | "cancelled";
  totalAmount: string;
  createdAt: string;
  supplier?: { name: string };
};

type Product = { id: string; name: string; sku: string; cost: string };
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
  received: "Recebido",
  cancelled: "Cancelado",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-marinha-100 text-marinha-600",
  confirmed: "bg-blue-100 text-blue-700",
  received: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function ErpPedidosCompraPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [skip, setSkip] = useState(0);

  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Party[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [supplierPartyId, setSupplierPartyId] = useState("");
  const [lines, setLines] = useState<OrderLine[]>([{ productId: "", qty: "1", unitPrice: "0" }]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const noBusinessId = !getBusinessId();

  const load = useCallback(
    async (reset = false) => {
      setIsLoading(true);
      setError(null);
      const currentSkip = reset ? 0 : skip;
      const res = await erpFetch<PurchaseOrder[]>(
        `/api/v1/erp/purchase-orders?take=${TAKE}&skip=${currentSkip}`,
      );
      if (res.ok && res.data) {
        setOrders((prev) => (reset ? res.data! : [...prev, ...res.data!]));
        setSkip(currentSkip + res.data.length);
        setHasMore(res.data.length === TAKE);
      } else {
        setError(res.error ?? "Erro ao carregar pedidos.");
      }
      setIsLoading(false);
    },
    [skip],
  );

  const loadSupport = useCallback(async () => {
    const [pRes, parRes] = await Promise.all([
      erpFetch<Product[]>("/api/v1/erp/products?take=100&skip=0"),
      erpFetch<Party[]>("/api/v1/erp/parties?take=100&skip=0"),
    ]);
    if (pRes.ok && pRes.data) setProducts(pRes.data);
    if (parRes.ok && parRes.data)
      setSuppliers(parRes.data.filter((p) => p.type === "supplier" || p.type === "both"));
  }, []);

  useEffect(() => {
    if (noBusinessId) return;
    load(true);
    loadSupport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noBusinessId]);

  const patchStatus = async (id: string, status: "confirmed" | "received" | "cancelled") => {
    const res = await erpFetch(`/api/v1/erp/purchase-orders/${id}/status`, {
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
          if (p) updated.unitPrice = p.cost;
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
    setSupplierPartyId("");
    setLines([{ productId: "", qty: "1", unitPrice: "0" }]);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!supplierPartyId) {
      setFormError("Selecione um fornecedor.");
      return;
    }
    const validLines = lines.filter((l) => l.productId && Number(l.qty) > 0);
    if (validLines.length === 0) {
      setFormError("Adicione pelo menos um item.");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    const res = await erpFetch<PurchaseOrder>("/api/v1/erp/purchase-orders", {
      method: "POST",
      body: JSON.stringify({
        supplierPartyId,
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

  const columns: ErpColumn<PurchaseOrder>[] = [
    {
      key: "id",
      label: "Nº",
      render: (r) => <span className="font-mono text-xs">{shortId(r.id)}</span>,
    },
    { key: "supplier", label: "Fornecedor", render: (r) => r.supplier?.name ?? "—" },
    { key: "createdAt", label: "Data", render: (r) => fmtDate(r.createdAt) },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[r.status]}`}
        >
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
              className="rounded-btn bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700"
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
            onClick={() => patchStatus(r.id, "received")}
            className="rounded-btn bg-green-600 px-2 py-1 text-xs font-semibold text-white hover:bg-green-700"
          >
            Marcar recebido
          </button>
        ) : null,
    },
  ];

  return (
    <>
      <PageIntro
        title="Pedidos de compra"
        description="Pedidos a fornecedores com itens e acompanhamento de status."
        badge="Compras"
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <Button variant="primary" onClick={openModal} disabled={noBusinessId}>
          Novo pedido de compra
        </Button>
      </div>
      <Card>
        <ErpDataTable
          columns={columns}
          data={orders}
          isLoading={isLoading}
          error={error}
          emptyMessage="Nenhum pedido de compra ainda."
          onRetry={() => load(true)}
          keyExtractor={(r) => r.id}
          hasMore={hasMore}
          onLoadMore={() => load(false)}
        />
      </Card>

      <ErpFormModal
        title="Novo pedido de compra"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Criar pedido"
      >
        <div className="mb-4 flex flex-col gap-1">
          <label className="text-xs font-medium text-marinha-700">Fornecedor *</label>
          <select
            value={supplierPartyId}
            onChange={(e) => setSupplierPartyId(e.target.value)}
            className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
          >
            <option value="">— Selecione um fornecedor —</option>
            {suppliers.map((p) => (
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
          <button type="button" onClick={addLine} className="text-sm text-municipal-700 hover:underline">
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
