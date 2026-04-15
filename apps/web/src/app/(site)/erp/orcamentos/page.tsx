"use client";

import { useCallback, useEffect, useState } from "react";
import { ErpDataTable, type ErpColumn } from "@/components/erp/erp-data-table";
import { ErpFormModal } from "@/components/erp/erp-form-modal";
import { PageIntro } from "@/components/layout/page-intro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSelectedBusinessId } from "@/hooks/use-selected-business-id";
import { erpFetch } from "@/lib/api-browser";
import type { ErpListResponse } from "@/lib/erp-list";

type Quote = {
  id: string;
  title: string;
  partyId: string | null;
  status: "draft" | "sent" | "approved" | "rejected" | "converted" | "cancelled";
  totalAmount: string;
  source: "erp" | "marketplace" | "opportunity";
  validUntil: string | null;
  createdAt: string;
  convertedSalesOrderId: string | null;
  convertedServiceOrderId: string | null;
  party?: { name: string };
};

type Product = { id: string; name: string; sku: string; price: string };
type Party = { id: string; name: string; type: string };
type QuoteLine = { productId: string; qty: string; unitPrice: string };

const TAKE = 50;

function fmtMoney(v: string) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

const STATUS_LABEL: Record<Quote["status"], string> = {
  draft: "Rascunho",
  sent: "Enviado",
  approved: "Aprovado",
  rejected: "Recusado",
  converted: "Convertido",
  cancelled: "Cancelado",
};

const STATUS_COLOR: Record<Quote["status"], string> = {
  draft: "bg-marinha-100 text-marinha-600",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-amber-100 text-amber-700",
  converted: "bg-municipal-600/15 text-municipal-800",
  cancelled: "bg-red-100 text-red-700",
};

export default function ErpOrcamentosPage() {
  const businessId = useSelectedBusinessId();
  const noBusinessId = !businessId;
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [partyId, setPartyId] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<QuoteLine[]>([{ productId: "", qty: "1", unitPrice: "0" }]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(
    async (reset = false) => {
      setIsLoading(true);
      setError(null);
      const currentSkip = reset ? 0 : skip;
      const res = await erpFetch<ErpListResponse<Quote>>(`/api/v1/erp/quotes?take=${TAKE}&skip=${currentSkip}`);
      if (res.ok && res.data) {
        const { items, total } = res.data;
        setQuotes((prev) => (reset ? items : [...prev, ...items]));
        setSkip(currentSkip + items.length);
        setHasMore(currentSkip + items.length < total);
      } else {
        setError(res.error ?? "Erro ao carregar orçamentos.");
      }
      setIsLoading(false);
    },
    [skip],
  );

  const loadSupport = useCallback(async () => {
    const [productRes, partyRes] = await Promise.all([
      erpFetch<ErpListResponse<Product>>("/api/v1/erp/products?take=100&skip=0"),
      erpFetch<ErpListResponse<Party>>("/api/v1/erp/parties?take=100&skip=0"),
    ]);
    if (productRes.ok && productRes.data) setProducts(productRes.data.items);
    if (partyRes.ok && partyRes.data) setParties(partyRes.data.items.filter((row) => row.type !== "supplier"));
  }, []);

  useEffect(() => {
    if (noBusinessId) {
      setQuotes([]);
      setProducts([]);
      setParties([]);
      setHasMore(false);
      setSkip(0);
      return;
    }
    load(true);
    loadSupport();
  }, [businessId, load, loadSupport, noBusinessId]);

  async function patchStatus(id: string, status: Quote["status"]) {
    const res = await erpFetch<Quote>(`/api/v1/erp/quotes/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (!res.ok || !res.data) {
      setError(res.error ?? "Não foi possível atualizar o orçamento.");
      return;
    }
    setQuotes((prev) => prev.map((quote) => (quote.id === id ? res.data! : quote)));
  }

  async function convert(id: string, target: "sales" | "service") {
    const path =
      target === "sales"
        ? `/api/v1/erp/quotes/${id}/convert-sales-order`
        : `/api/v1/erp/quotes/${id}/convert-service-order`;
    const res = await erpFetch<Quote>(path, { method: "POST" });
    if (!res.ok || !res.data) {
      setError(res.error ?? "Não foi possível converter o orçamento.");
      return;
    }
    setQuotes((prev) => prev.map((quote) => (quote.id === id ? res.data! : quote)));
  }

  function updateLine(index: number, key: keyof QuoteLine, value: string) {
    setLines((current) =>
      current.map((line, currentIndex) => {
        if (currentIndex !== index) return line;
        const next = { ...line, [key]: value };
        if (key === "productId") {
          const product = products.find((row) => row.id === value);
          if (product) next.unitPrice = product.price;
        }
        return next;
      }),
    );
  }

  function addLine() {
    setLines((current) => [...current, { productId: "", qty: "1", unitPrice: "0" }]);
  }

  function removeLine(index: number) {
    setLines((current) => (current.length === 1 ? current : current.filter((_, currentIndex) => currentIndex !== index)));
  }

  function openModal() {
    setTitle("");
    setPartyId("");
    setValidUntil("");
    setNote("");
    setLines([{ productId: "", qty: "1", unitPrice: "0" }]);
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit() {
    const validLines = lines.filter((line) => line.productId && Number(line.qty) > 0);
    if (!title.trim()) {
      setFormError("Informe um título para o orçamento.");
      return;
    }
    if (validLines.length === 0) {
      setFormError("Adicione pelo menos um item válido.");
      return;
    }
    setIsSubmitting(true);
    const res = await erpFetch<Quote>("/api/v1/erp/quotes", {
      method: "POST",
      body: JSON.stringify({
        title,
        partyId: partyId || undefined,
        validUntil: validUntil || undefined,
        note: note.trim() || undefined,
        items: validLines,
      }),
    });
    setIsSubmitting(false);
    if (!res.ok || !res.data) {
      setFormError(res.error ?? "Não foi possível criar o orçamento.");
      return;
    }
    setQuotes((prev) => [res.data!, ...prev]);
    setModalOpen(false);
  }

  const columns: ErpColumn<Quote>[] = [
    { key: "title", label: "Orçamento", render: (row) => <span className="font-semibold text-marinha-900">{row.title}</span> },
    { key: "client", label: "Cliente", render: (row) => row.party?.name ?? "—" },
    { key: "validUntil", label: "Validade", render: (row) => fmtDate(row.validUntil) },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[row.status]}`}>
          {STATUS_LABEL[row.status]}
        </span>
      ),
    },
    { key: "total", label: "Total", render: (row) => fmtMoney(row.totalAmount) },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          {row.status === "draft" ? (
            <>
              <button onClick={() => patchStatus(row.id, "sent")} className="rounded-btn bg-blue-600 px-2 py-1 text-xs font-semibold text-white">
                Enviar
              </button>
              <button onClick={() => patchStatus(row.id, "cancelled")} className="rounded-btn border border-red-300 px-2 py-1 text-xs font-semibold text-red-600">
                Cancelar
              </button>
            </>
          ) : null}
          {row.status === "sent" ? (
            <>
              <button onClick={() => patchStatus(row.id, "approved")} className="rounded-btn bg-green-600 px-2 py-1 text-xs font-semibold text-white">
                Aprovar
              </button>
              <button onClick={() => patchStatus(row.id, "rejected")} className="rounded-btn border border-amber-300 px-2 py-1 text-xs font-semibold text-amber-700">
                Recusar
              </button>
            </>
          ) : null}
          {row.status === "approved" ? (
            <>
              <button onClick={() => convert(row.id, "sales")} className="rounded-btn border border-municipal-600/40 px-2 py-1 text-xs font-semibold text-municipal-700">
                Virar venda
              </button>
              <button onClick={() => convert(row.id, "service")} className="rounded-btn border border-marinha-900/20 px-2 py-1 text-xs font-semibold text-marinha-700">
                Virar OS
              </button>
            </>
          ) : null}
        </div>
      ),
    },
  ];

  const totalDrafts = quotes.filter((row) => row.status === "draft" || row.status === "sent").length;

  return (
    <>
      <PageIntro
        title="Orçamentos"
        description="Monte propostas, acompanhe a aprovação e transforme o orçamento em venda ou atendimento."
        badge="Comercial"
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card variant="featured">
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Pipeline</p>
          <p className="mt-2 text-lg font-bold text-marinha-900">{totalDrafts} em negociação</p>
          <p className="mt-1 text-sm text-marinha-500">Rascunhos e orçamentos enviados aguardando decisão.</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Clientes</p>
          <p className="mt-2 text-lg font-bold text-marinha-900">{parties.length}</p>
          <p className="mt-1 text-sm text-marinha-500">Contatos prontos para vincular às propostas.</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Itens disponíveis</p>
          <p className="mt-2 text-lg font-bold text-marinha-900">{products.length}</p>
          <p className="mt-1 text-sm text-marinha-500">Base única para comércio e serviços.</p>
        </Card>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <Button variant="primary" onClick={openModal} disabled={noBusinessId}>
          Novo orçamento
        </Button>
        <Badge tone="accent">Propostas</Badge>
      </div>

      <Card>
        <div className="mb-4">
          <h2 className="font-serif text-lg font-bold text-marinha-900">Propostas comerciais</h2>
          <p className="mt-1 text-sm text-marinha-500">Use esta área para acompanhar propostas desde a criação até o fechamento.</p>
        </div>
        <ErpDataTable
          columns={columns}
          data={quotes}
          isLoading={isLoading}
          error={error}
          emptyMessage="Nenhum orçamento cadastrado."
          onRetry={() => load(true)}
          onLoadMore={() => load(false)}
          hasMore={hasMore}
          keyExtractor={(row) => row.id}
        />
      </Card>

      <ErpFormModal
        title="Novo orçamento"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Criar orçamento"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-marinha-700">Título</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="focus-ring w-full rounded-btn border-2 border-marinha-900/20 px-3 py-2 text-sm" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-marinha-700">Cliente</label>
              <select value={partyId} onChange={(e) => setPartyId(e.target.value)} className="focus-ring min-h-[44px] w-full rounded-btn border-2 border-marinha-900/20 bg-white px-3 py-2 text-sm">
                <option value="">— Sem cliente —</option>
                {parties.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-marinha-700">Válido até</label>
              <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="focus-ring w-full rounded-btn border-2 border-marinha-900/20 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-marinha-700">Itens</label>
            <div className="space-y-2">
              {lines.map((line, index) => (
                <div key={index} className="grid grid-cols-[1fr_90px_110px_auto] gap-2">
                  <select value={line.productId} onChange={(e) => updateLine(index, "productId", e.target.value)} className="focus-ring min-h-[44px] rounded-btn border-2 border-marinha-900/20 bg-white px-3 py-2 text-sm">
                    <option value="">— Produto/serviço —</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.sku} — {product.name}
                      </option>
                    ))}
                  </select>
                  <input type="number" min="0.001" step="0.001" value={line.qty} onChange={(e) => updateLine(index, "qty", e.target.value)} className="focus-ring rounded-btn border-2 border-marinha-900/20 px-3 py-2 text-sm" />
                  <input type="number" min="0" step="0.01" value={line.unitPrice} onChange={(e) => updateLine(index, "unitPrice", e.target.value)} className="focus-ring rounded-btn border-2 border-marinha-900/20 px-3 py-2 text-sm" />
                  <button type="button" onClick={() => removeLine(index)} className="rounded-btn px-2 text-red-600">
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addLine} className="mt-2 text-sm font-semibold text-municipal-700 hover:underline">
              + Adicionar item
            </button>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-marinha-700">Observação</label>
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} className="focus-ring w-full rounded-btn border-2 border-marinha-900/20 px-3 py-2 text-sm" />
          </div>
          {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
        </div>
      </ErpFormModal>
    </>
  );
}
