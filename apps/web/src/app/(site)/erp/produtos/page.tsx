"use client";

import Link from "next/link";
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

type Product = {
  id: string;
  kind: "product" | "service";
  sku: string;
  name: string;
  unit: string;
  barcode?: string | null;
  supplierCode?: string | null;
  ncm?: string | null;
  cest?: string | null;
  originCode?: string | null;
  cfopDefault?: string | null;
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
  barcode?: string;
  supplierCode?: string;
  ncm?: string;
  cest?: string;
  originCode?: string;
  cfopDefault?: string;
  price: string;
  cost: string;
  minStock: string;
  launchInitialStock: boolean;
  initialStockQuantity: string;
  initialStockLocationId: string;
};

type ClassificationSuggestion = {
  productId: string;
  ncm?: string | null;
  cfopDefault?: string | null;
  originCode?: string | null;
  cest?: string | null;
};

type ClassificationJobResult = {
  suggestions?: ClassificationSuggestion[];
  stats?: {
    total?: number;
    classified?: number;
    skipped?: number;
  };
};

type ClassificationJobPayload = {
  status?: string;
  error?: string | null;
  result?: ClassificationJobResult | null;
};

type StockLocation = {
  id: string;
  name: string;
  isDefault: boolean;
};

const EMPTY_FORM: CreateForm = {
  kind: "product",
  sku: "",
  name: "",
  unit: "UN",
  barcode: "",
  supplierCode: "",
  ncm: "",
  cest: "",
  originCode: "",
  cfopDefault: "",
  price: "0",
  cost: "0",
  minStock: "0",
  launchInitialStock: false,
  initialStockQuantity: "0",
  initialStockLocationId: "",
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
  const [stockLocations, setStockLocations] = useState<StockLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [skip, setSkip] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [classifyOpen, setClassifyOpen] = useState(false);
  const [classifyOnlyMissing, setClassifyOnlyMissing] = useState(true);
  const [classifyLimit, setClassifyLimit] = useState(50);
  const [classifyJobId, setClassifyJobId] = useState<string | null>(null);
  const [classifyStatus, setClassifyStatus] = useState<string | null>(null);
  const [classifyResult, setClassifyResult] = useState<ClassificationJobResult | null>(null);
  const [classifyError, setClassifyError] = useState<string | null>(null);
  const [isClassifySubmitting, setIsClassifySubmitting] = useState(false);
  const [isApplySubmitting, setIsApplySubmitting] = useState(false);

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

  const loadStockLocations = useCallback(async () => {
    const res = await erpFetch<StockLocation[]>("/api/v1/erp/stock/locations");
    if (res.ok && res.data) {
      setStockLocations(res.data);
    }
  }, []);

  useEffect(() => {
    if (noBusinessId) {
      setProducts([]);
      setStockLocations([]);
      setHasMore(false);
      setSkip(0);
      return;
    }
    void load(true);
    void loadStockLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const openModal = () => {
    const defaultLocation = stockLocations.find((location) => location.isDefault)?.id ?? "";
    setForm({ ...EMPTY_FORM, initialStockLocationId: defaultLocation });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.sku.trim() || !form.name.trim()) {
      setFormError("SKU e Nome são obrigatórios.");
      return;
    }
    if (form.kind === "product") {
      const n = (form.ncm ?? "").replace(/\D/g, "");
      if (n && n.length !== 8) {
        setFormError("NCM deve ter 8 dígitos (ou deixe vazio para classificar depois).");
        return;
      }
    }
    setIsSubmitting(true);
    setFormError(null);
    const res = await erpFetch<Product>("/api/v1/erp/products", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        barcode: form.barcode?.trim() || undefined,
        supplierCode: form.supplierCode?.trim() || undefined,
        ncm: form.ncm?.trim() || undefined,
        cest: form.cest?.trim() || undefined,
        originCode: form.originCode?.trim() || undefined,
        cfopDefault: form.cfopDefault?.trim() || undefined,
        initialStockQuantity:
          form.kind === "product" && form.launchInitialStock ? form.initialStockQuantity : undefined,
        initialStockLocationId:
          form.kind === "product" && form.launchInitialStock
            ? form.initialStockLocationId || undefined
            : undefined,
      }),
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
      value={typeof form[key] === "boolean" ? "" : (form[key] ?? "")}
      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
      {...extra}
    />
  );

  const pollJob = useCallback(
    async (jobId: string) => {
      const res = await erpFetch<ClassificationJobPayload>(
        `/api/v1/erp/products/classification-jobs/${jobId}`,
      );
      if (!res.ok || !res.data) return;
      setClassifyStatus(res.data.status ?? null);
      if (res.data.status === "done" || res.data.status === "failed") {
        setClassifyResult(res.data.result ?? null);
        if (res.data.status === "failed") {
          setClassifyError(res.data.error ?? "Job falhou.");
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!classifyJobId) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await pollJob(classifyJobId);
    };
    const t = setInterval(() => void tick(), 2500);
    void tick();
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [classifyJobId, pollJob]);

  const startClassification = async () => {
    setClassifyError(null);
    setClassifyResult(null);
    setClassifyStatus(null);
    setIsClassifySubmitting(true);
    const res = await erpFetch<{ id: string }>("/api/v1/erp/products/classification-jobs", {
      method: "POST",
      body: JSON.stringify({
        onlyMissingNcm: classifyOnlyMissing,
        limit: classifyLimit,
      }),
    });
    setIsClassifySubmitting(false);
    if (!res.ok || !res.data) {
      setClassifyError(res.error ?? "Não foi possível iniciar a classificação.");
      return;
    }
    setClassifyJobId(res.data.id);
  };

  const applyClassification = async () => {
    if (!classifyJobId) return;
    setIsApplySubmitting(true);
    const res = await erpFetch<{ applied: number; skipped: number }>(
      `/api/v1/erp/products/classification-jobs/${classifyJobId}/apply`,
      { method: "POST" },
    );
    setIsApplySubmitting(false);
    if (!res.ok || !res.data) {
      setClassifyError(res.error ?? "Falha ao aplicar classificações.");
      return;
    }
    setClassifyOpen(false);
    setClassifyJobId(null);
    setClassifyResult(null);
    setClassifyStatus(null);
    setClassifyError(null);
    void load(true);
  };

  return (
    <>
      <PageIntro
        title="Produtos"
        description="Organize seu catálogo de produtos e serviços com preço, unidade e estoque mínimo para a operação diária."
        badge="Cadastros"
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card variant="featured">
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Catálogo</p>
          <p className="mt-2 text-lg font-bold text-marinha-900">{products.length} itens carregados</p>
          <p className="mt-1 text-sm text-marinha-500">Produtos e serviços disponíveis no ERP.</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Mix de venda</p>
          <p className="mt-2 text-lg font-bold text-marinha-900">Produtos e serviços</p>
          <p className="mt-1 text-sm text-marinha-500">Cadastre itens físicos e também serviços prestados.</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Ação rápida</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Badge tone="accent">Cadastro</Badge>
            <Button variant="primary" onClick={openModal} disabled={noBusinessId}>
              Novo produto
            </Button>
            <Link
              href="/erp/estoque"
              className="inline-flex min-h-[44px] items-center rounded-btn border border-marinha-900/20 px-4 py-2 text-sm font-semibold text-marinha-700 hover:bg-marinha-50"
            >
              Entrada por XML no estoque
            </Link>
            <Button
              variant="secondary"
              onClick={() => setClassifyOpen(true)}
              disabled={noBusinessId}
            >
              Classificar com IA
            </Button>
          </div>
        </Card>
      </div>

      <div className="mb-4 rounded-btn border border-cerrado-500/25 bg-cerrado-500/10 px-4 py-3 text-sm text-marinha-700">
        Use esta tela para cuidar do catalogo. Entradas por NF-e XML e lancamentos de saldo ficam em
        <strong> Estoque</strong>, onde tambem e possivel atualizar cadastro de produto durante a entrada.
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg font-bold text-marinha-900">Lista de produtos e serviços</h2>
            <p className="mt-1 text-sm text-marinha-500">Use este cadastro como base para vendas, compras, estoque e fiscal.</p>
          </div>
          <Badge tone="neutral">Catálogo</Badge>
        </div>
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
        <p className="mb-4 text-sm text-marinha-500">
          Preencha as informações principais do item para começar a usar no catálogo e nas rotinas do ERP.
        </p>
        <div className="grid grid-cols-2 gap-4">
          {field(
            "Tipo",
            <select
              value={form.kind}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  kind: e.target.value as "product" | "service",
                  launchInitialStock:
                    e.target.value === "product" ? f.launchInitialStock : false,
                }))
              }
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
        {form.kind === "product" ? (
          <details className="mt-4 rounded-btn border border-marinha-900/10 bg-cerrado-500/5 px-4 py-3" open={form.launchInitialStock}>
            <summary className="cursor-pointer text-sm font-semibold text-marinha-800">
              Estoque inicial (opcional)
            </summary>
            <p className="mt-2 text-xs text-marinha-600">
              Use quando quiser que o produto ja entre no estoque ao ser cadastrado.
            </p>
            <label className="mt-3 flex items-center gap-2 text-sm text-marinha-700">
              <input
                type="checkbox"
                checked={form.launchInitialStock}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    launchInitialStock: event.target.checked,
                    initialStockLocationId:
                      event.target.checked && !current.initialStockLocationId
                        ? stockLocations.find((location) => location.isDefault)?.id ?? ""
                        : current.initialStockLocationId,
                  }))
                }
              />
              Lancar saldo inicial agora
            </label>
            {form.launchInitialStock ? (
              <div className="mt-3 grid grid-cols-2 gap-4">
                {field(
                  "Quantidade inicial",
                  <input
                    type="number"
                    min="0.0001"
                    step="0.0001"
                    value={form.initialStockQuantity}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, initialStockQuantity: event.target.value }))
                    }
                    className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
                  />,
                )}
                {field(
                  "Local do estoque",
                  <select
                    value={form.initialStockLocationId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, initialStockLocationId: event.target.value }))
                    }
                    className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
                  >
                    <option value="">Usar local padrao</option>
                    {stockLocations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                        {location.isDefault ? " (padrao)" : ""}
                      </option>
                    ))}
                  </select>,
                )}
              </div>
            ) : null}
          </details>
        ) : null}
        <details className="mt-4 rounded-btn border border-marinha-900/10 bg-marinha-900/5 px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-marinha-800">
            Fiscal (opcional) — NCM/CFOP/origem
          </summary>
          <p className="mt-2 text-xs text-marinha-600">
            Para NF-e, o NCM (8 dígitos) é obrigatório. Se não souber agora, deixe vazio e use
            “Classificar com IA”.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div className="col-span-2">{field("Código de barras (EAN)", input("barcode"))}</div>
            {field("NCM (8 dígitos)", input("ncm"))}
            {field("CFOP padrão", input("cfopDefault"))}
            {field("Origem (0-8)", input("originCode"))}
            {field("CEST", input("cest"))}
          </div>
        </details>
        {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
      </ErpFormModal>

      <ErpFormModal
        title="Classificar produtos com IA"
        open={classifyOpen}
        onClose={() => {
          setClassifyOpen(false);
          setClassifyError(null);
        }}
        onSubmit={startClassification}
        isSubmitting={isClassifySubmitting}
        submitLabel="Iniciar job"
      >
        <p className="mb-3 text-sm text-marinha-500">
          Você pode cadastrar produtos sem classificação fiscal e depois rodar a IA para sugerir NCM/CFOP/origem
          em lote. O job roda no servidor e você aplica o resultado ao final.
        </p>
        <div className="grid grid-cols-2 gap-4">
          {field(
            "Escopo",
            <select
              value={classifyOnlyMissing ? "missing" : "all"}
              onChange={(e) => setClassifyOnlyMissing(e.target.value === "missing")}
              className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
            >
              <option value="missing">Somente sem NCM</option>
              <option value="all">Todos (não recomendado)</option>
            </select>,
          )}
          {field(
            "Limite",
            <input
              type="number"
              min={1}
              max={500}
              value={classifyLimit}
              onChange={(e) => setClassifyLimit(Number(e.target.value || 50))}
              className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
            />,
          )}
        </div>

        {classifyJobId && (
          <div className="mt-4 rounded-btn border border-marinha-900/10 bg-marinha-900/5 px-4 py-3">
            <p className="text-sm font-semibold text-marinha-900">
              Status do job: <span className="font-mono">{classifyStatus ?? "…"}</span>
            </p>
            {classifyResult?.stats ? null : null}
            {classifyResult?.suggestions?.length ? (
              <p className="mt-2 text-sm text-marinha-700">
                Sugestões prontas: <strong>{classifyResult.suggestions.length}</strong>
              </p>
            ) : null}
            {classifyStatus === "done" && (
              <div className="mt-3 flex gap-2">
                <Button type="button" variant="primary" onClick={applyClassification} disabled={isApplySubmitting}>
                  {isApplySubmitting ? "Aplicando…" : "Aplicar no cadastro"}
                </Button>
              </div>
            )}
          </div>
        )}

        {classifyError && <p className="mt-3 whitespace-pre-line text-sm text-red-600">{classifyError}</p>}
      </ErpFormModal>
    </>
  );
}
