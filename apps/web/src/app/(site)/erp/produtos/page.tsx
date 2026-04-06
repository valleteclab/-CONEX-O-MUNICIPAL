"use client";

import { useCallback, useEffect, useState } from "react";
import { ErpDataTable, type ErpColumn } from "@/components/erp/erp-data-table";
import { ErpFormModal } from "@/components/erp/erp-form-modal";
import { PageIntro } from "@/components/layout/page-intro";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSelectedBusinessId } from "@/hooks/use-selected-business-id";
import { erpFetch } from "@/lib/api-browser";
import type { ErpListResponse } from "@/lib/erp-list";

type Product = {
  id: string;
  kind: "product" | "service";
  sku: string;
  name: string;
  unit: string;
  price: string;
  cost: string;
  minStock: string;
  isActive: boolean;
};

type CreateForm = {
  kind: "product" | "service";
  sku: string;
  name: string;
  unit: string;
  price: string;
  cost: string;
  minStock: string;
};

const EMPTY_FORM: CreateForm = {
  kind: "product",
  sku: "",
  name: "",
  unit: "UN",
  price: "0",
  cost: "0",
  minStock: "0",
};

const TAKE = 50;

function fmt(value: string) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const columns: ErpColumn<Product>[] = [
  { key: "sku", label: "SKU", render: (r) => <span className="font-mono text-xs">{r.sku}</span> },
  { key: "name", label: "Nome", render: (r) => r.name },
  { key: "kind", label: "Tipo", render: (r) => (r.kind === "service" ? "Serviço" : "Produto") },
  { key: "unit", label: "Unidade", render: (r) => r.unit },
  { key: "price", label: "Preço", render: (r) => fmt(r.price) },
  { key: "minStock", label: "Est. mín.", render: (r) => r.minStock },
  {
    key: "status",
    label: "Status",
    render: (r) => (
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.isActive ? "bg-green-100 text-green-700" : "bg-marinha-100 text-marinha-500"}`}
      >
        {r.isActive ? "Ativo" : "Inativo"}
      </span>
    ),
  },
];

export default function ErpProdutosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [skip, setSkip] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const businessId = useSelectedBusinessId();
  const noBusinessId = !businessId;

  const load = useCallback(async (reset = false) => {
    setIsLoading(true);
    setError(null);
    const currentSkip = reset ? 0 : skip;
    const res = await erpFetch<ErpListResponse<Product>>(
      `/api/v1/erp/products?take=${TAKE}&skip=${currentSkip}`,
    );
    if (res.ok && res.data) {
      const { items, total } = res.data;
      setProducts((prev) => (reset ? items : [...prev, ...items]));
      setSkip(currentSkip + items.length);
      setHasMore(currentSkip + items.length < total);
    } else {
      setError(res.error ?? "Erro ao carregar produtos.");
    }
    setIsLoading(false);
  }, [skip]);

  useEffect(() => {
    if (noBusinessId) {
      setProducts([]);
      setHasMore(false);
      setSkip(0);
      return;
    }
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const openModal = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.sku.trim() || !form.name.trim()) {
      setFormError("SKU e Nome são obrigatórios.");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    const res = await erpFetch<Product>("/api/v1/erp/products", {
      method: "POST",
      body: JSON.stringify(form),
    });
    if (res.ok && res.data) {
      setProducts((prev) => [res.data!, ...prev]);
      setModalOpen(false);
    } else {
      setFormError(res.error ?? "Erro ao criar produto.");
    }
    setIsSubmitting(false);
  };

  const field = (label: string, el: React.ReactNode) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-marinha-700">{label}</label>
      {el}
    </div>
  );

  const input = (key: keyof CreateForm, type = "text", extra?: object) => (
    <input
      type={type}
      value={form[key]}
      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
      {...extra}
    />
  );

  return (
    <>
      <PageIntro
        title="Produtos"
        description="Cadastro de itens para venda ou consumo interno, com SKU, NCM e controle de preço."
        badge="Cadastros"
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <Button variant="primary" onClick={openModal} disabled={noBusinessId}>
          Novo produto
        </Button>
      </div>
      <Card>
        <ErpDataTable
          columns={columns}
          data={products}
          isLoading={isLoading}
          error={error}
          emptyMessage="Nenhum produto cadastrado ainda."
          onRetry={() => load(true)}
          keyExtractor={(r) => r.id}
          hasMore={hasMore}
          onLoadMore={() => load(false)}
        />
      </Card>

      <ErpFormModal
        title="Novo produto"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      >
        <div className="grid grid-cols-2 gap-4">
          {field(
            "Tipo",
            <select
              value={form.kind}
              onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as "product" | "service" }))}
              className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
            >
              <option value="product">Produto</option>
              <option value="service">Serviço</option>
            </select>,
          )}
          {field("SKU *", input("sku"))}
          <div className="col-span-2">{field("Nome *", input("name"))}</div>
          {field("Unidade", input("unit"))}
          {field("Preço de venda (R$)", input("price", "number"))}
          {field("Custo (R$)", input("cost", "number"))}
          {field("Estoque mínimo", input("minStock", "number"))}
        </div>
        {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
      </ErpFormModal>
    </>
  );
}
