"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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

type ImportParty = {
  id: string;
  name: string;
  document?: string | null;
  stateRegistration?: string | null;
};

type ImportProductRef = {
  id: string;
  sku: string;
  name: string;
  barcode?: string | null;
  supplierCode?: string | null;
  unit: string;
  cost: string;
};

type ImportItem = {
  id: string;
  lineNumber: number;
  supplierCode?: string | null;
  barcode?: string | null;
  name: string;
  ncm?: string | null;
  cest?: string | null;
  cfop?: string | null;
  originCode?: string | null;
  unit?: string | null;
  qty: string;
  unitPrice: string;
  totalPrice: string;
  suggestedProductId?: string | null;
  suggestedProduct?: ImportProductRef | null;
  selectedProductId?: string | null;
  selectedProduct?: ImportProductRef | null;
  matchMeta?: {
    strategy?: string;
    confidence?: number | null;
    reason?: string | null;
  } | null;
  draftProduct?: {
    sku?: string;
    name?: string;
    unit?: string;
    barcode?: string | null;
    supplierCode?: string | null;
    ncm?: string | null;
    cest?: string | null;
    cfopDefault?: string | null;
    originCode?: string | null;
    cost?: string;
  } | null;
  action?: "link" | "create" | "ignore" | null;
};

type XmlImportDetail = {
  id: string;
  accessKey: string;
  invoiceNumber?: string | null;
  invoiceSeries?: string | null;
  issuedAt?: string | null;
  status: "uploaded" | "applied";
  purchaseOrderId?: string | null;
  summary?: {
    totalAmount?: string;
    totalItems?: number;
  } | null;
  supplierParty?: ImportParty | null;
  items: ImportItem[];
};

type ImportDecision = {
  action: "link" | "create" | "ignore";
  selectedProductId: string;
  createProduct: {
    sku: string;
    name: string;
    unit: string;
    barcode: string;
    supplierCode: string;
    ncm: string;
    cest: string;
    cfopDefault: string;
    originCode: string;
    cost: string;
  };
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
};

const TAKE = 50;

function fmt(value: string) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR");
}

function buildDecision(item: ImportItem): ImportDecision {
  return {
    action: item.suggestedProductId ? "link" : "create",
    selectedProductId: item.suggestedProductId ?? "",
    createProduct: {
      sku: item.draftProduct?.sku ?? "",
      name: item.draftProduct?.name ?? item.name,
      unit: item.draftProduct?.unit ?? item.unit ?? "UN",
      barcode: item.draftProduct?.barcode ?? item.barcode ?? "",
      supplierCode: item.draftProduct?.supplierCode ?? item.supplierCode ?? "",
      ncm: item.draftProduct?.ncm ?? item.ncm ?? "",
      cest: item.draftProduct?.cest ?? item.cest ?? "",
      cfopDefault: item.draftProduct?.cfopDefault ?? item.cfop ?? "",
      originCode: item.draftProduct?.originCode ?? item.originCode ?? "",
      cost: item.draftProduct?.cost ?? item.unitPrice,
    },
  };
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
  const [catalogOptions, setCatalogOptions] = useState<Product[]>([]);
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

  const [importOpen, setImportOpen] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImportSubmitting, setIsImportSubmitting] = useState(false);
  const [isImportApplying, setIsImportApplying] = useState(false);
  const [isCreatingPurchaseOrder, setIsCreatingPurchaseOrder] = useState(false);
  const [xmlImport, setXmlImport] = useState<XmlImportDetail | null>(null);
  const [importDecisions, setImportDecisions] = useState<Record<string, ImportDecision>>({});
  const [createdPurchaseOrderId, setCreatedPurchaseOrderId] = useState<string | null>(null);

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

  const loadCatalogOptions = useCallback(async () => {
    const res = await erpFetch<ErpListResponse<Product>>("/api/v1/erp/products?take=200&skip=0");
    if (res.ok && res.data) {
      setCatalogOptions(res.data.items.filter((item) => item.kind === "product"));
    }
  }, []);

  useEffect(() => {
    if (noBusinessId) {
      setProducts([]);
      setCatalogOptions([]);
      setHasMore(false);
      setSkip(0);
      return;
    }
    void load(true);
    void loadCatalogOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const openModal = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  };

  const openImportModal = () => {
    setImportOpen(true);
    setImportStep(1);
    setImportFile(null);
    setImportError(null);
    setXmlImport(null);
    setImportDecisions({});
    setCreatedPurchaseOrderId(null);
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
      }),
    });
    if (res.ok && res.data) {
      setProducts((prev) => [res.data!, ...prev]);
      setModalOpen(false);
      void loadCatalogOptions();
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
    void loadCatalogOptions();
  };

  const importSummary = useMemo(() => {
    const decisions = Object.values(importDecisions);
    return {
      link: decisions.filter((item) => item.action === "link").length,
      create: decisions.filter((item) => item.action === "create").length,
      ignore: decisions.filter((item) => item.action === "ignore").length,
    };
  }, [importDecisions]);

  const importModalTitle =
    importStep === 1
      ? "Importar XML da NF-e"
      : importStep === 2
        ? "Revisar importacao XML"
        : "Resumo da importacao";

  const importSubmitLabel =
    importStep === 1 ? "Ler XML" : importStep === 2 ? "Aplicar no catalogo" : "Concluir";

  async function handleImportSubmit() {
    if (importStep === 1) {
      if (!importFile) {
        setImportError("Selecione um arquivo XML para importar.");
        return;
      }
      setIsImportSubmitting(true);
      setImportError(null);
      const xmlContent = await importFile.text();
      const res = await erpFetch<XmlImportDetail>("/api/v1/erp/products/xml-imports", {
        method: "POST",
        body: JSON.stringify({ xmlContent }),
      });
      setIsImportSubmitting(false);
      if (!res.ok || !res.data) {
        setImportError(res.error ?? "Nao foi possivel importar o XML.");
        return;
      }
      setXmlImport(res.data);
      setImportDecisions(
        Object.fromEntries(res.data.items.map((item) => [item.id, buildDecision(item)])),
      );
      setImportStep(2);
      return;
    }

    if (importStep === 2) {
      if (!xmlImport) return;
      setIsImportApplying(true);
      setImportError(null);
      const res = await erpFetch<XmlImportDetail>(
        `/api/v1/erp/products/xml-imports/${xmlImport.id}/apply`,
        {
          method: "POST",
          body: JSON.stringify({
            items: xmlImport.items.map((item) => ({
              itemId: item.id,
              action: importDecisions[item.id]?.action ?? "ignore",
              selectedProductId: importDecisions[item.id]?.selectedProductId || undefined,
              createProduct:
                importDecisions[item.id]?.action === "create"
                  ? importDecisions[item.id]?.createProduct
                  : undefined,
            })),
          }),
        },
      );
      setIsImportApplying(false);
      if (!res.ok || !res.data) {
        setImportError(res.error ?? "Nao foi possivel aplicar a importacao.");
        return;
      }
      setXmlImport(res.data);
      setImportStep(3);
      void load(true);
      void loadCatalogOptions();
      return;
    }

    setImportOpen(false);
  }

  async function createPurchaseOrderFromImport() {
    if (!xmlImport) return;
    setIsCreatingPurchaseOrder(true);
    setImportError(null);
    const res = await erpFetch<{ id: string }>(
      `/api/v1/erp/products/xml-imports/${xmlImport.id}/create-purchase-order`,
      { method: "POST" },
    );
    setIsCreatingPurchaseOrder(false);
    if (!res.ok || !res.data) {
      setImportError(res.error ?? "Nao foi possivel gerar o pedido de compra.");
      return;
    }
    setCreatedPurchaseOrderId(res.data.id);
    setXmlImport((current) => (current ? { ...current, purchaseOrderId: res.data!.id } : current));
  }

  function setDecisionAction(itemId: string, action: ImportDecision["action"]) {
    setImportDecisions((current) => ({
      ...current,
      [itemId]: { ...current[itemId], action },
    }));
  }

  function setDecisionProduct(itemId: string, selectedProductId: string) {
    setImportDecisions((current) => ({
      ...current,
      [itemId]: { ...current[itemId], selectedProductId },
    }));
  }

  function setDecisionDraftField(
    itemId: string,
    key: keyof ImportDecision["createProduct"],
    value: string,
  ) {
    setImportDecisions((current) => ({
      ...current,
      [itemId]: {
        ...current[itemId],
        createProduct: {
          ...current[itemId].createProduct,
          [key]: value,
        },
      },
    }));
  }

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
            <Button variant="secondary" onClick={openImportModal} disabled={noBusinessId}>
              Importar XML
            </Button>
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
        A importacao de XML concilia fornecedor e itens do catalogo. Depois disso, voce pode gerar um
        <strong> pedido de compra em rascunho</strong> sem lancar estoque automaticamente.
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
        title={importModalTitle}
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSubmit={() => void handleImportSubmit()}
        isSubmitting={isImportSubmitting || isImportApplying}
        submitLabel={importSubmitLabel}
      >
        {importStep === 1 ? (
          <>
            <p className="mb-4 text-sm text-marinha-500">
              Envie o XML da NF-e de entrada. O sistema vai ler o fornecedor, os itens e sugerir
              como conciliar com o catalogo ja existente.
            </p>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-marinha-700">Arquivo XML</label>
              <input
                type="file"
                accept=".xml,text/xml,application/xml"
                onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm"
              />
              {importFile ? (
                <p className="text-xs text-marinha-500">Arquivo selecionado: {importFile.name}</p>
              ) : null}
            </div>
          </>
        ) : null}

        {importStep === 2 && xmlImport ? (
          <div className="space-y-4">
            <div className="rounded-btn border border-marinha-900/10 bg-marinha-900/5 px-4 py-3">
              <p className="text-sm font-semibold text-marinha-900">
                NF-e {xmlImport.invoiceNumber ?? "-"} serie {xmlImport.invoiceSeries ?? "-"}
              </p>
              <p className="mt-1 text-xs text-marinha-600">Chave: {xmlImport.accessKey}</p>
              <p className="mt-1 text-xs text-marinha-600">
                Emissao: {fmtDate(xmlImport.issuedAt)} | Total: {fmt(xmlImport.summary?.totalAmount ?? "0")}
              </p>
            </div>

            <div className="rounded-btn border border-green-200 bg-green-50 px-4 py-3">
              <p className="text-sm font-semibold text-green-900">Fornecedor conciliado automaticamente</p>
              <p className="mt-1 text-sm text-green-800">{xmlImport.supplierParty?.name ?? "Fornecedor"}</p>
              <p className="mt-1 text-xs text-green-800">
                Documento: {xmlImport.supplierParty?.document ?? "-"} | IE:{" "}
                {xmlImport.supplierParty?.stateRegistration ?? "-"}
              </p>
            </div>

            <div className="rounded-btn border border-marinha-900/10 bg-white px-4 py-3">
              <p className="text-sm font-semibold text-marinha-900">Resumo da revisao</p>
              <p className="mt-2 text-xs text-marinha-600">
                Vincular: {importSummary.link} | Criar: {importSummary.create} | Ignorar: {importSummary.ignore}
              </p>
            </div>

            <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
              {xmlImport.items.map((item) => {
                const decision = importDecisions[item.id];
                return (
                  <div key={item.id} className="rounded-btn border border-marinha-900/10 bg-white px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-marinha-900">
                          Item {item.lineNumber}: {item.name}
                        </p>
                        <p className="mt-1 text-xs text-marinha-500">
                          Cod. fornecedor: {item.supplierCode ?? "-"} | EAN: {item.barcode ?? "-"} | Unidade:{" "}
                          {item.unit ?? "-"}
                        </p>
                        <p className="mt-1 text-xs text-marinha-500">
                          Qtd: {item.qty} | Custo unit.: {fmt(item.unitPrice)} | Total: {fmt(item.totalPrice)}
                        </p>
                      </div>
                      {item.matchMeta?.reason ? (
                        <div className="rounded-full bg-cerrado-500/10 px-3 py-1 text-xs font-semibold text-marinha-700">
                          Sugestao {Math.round((item.matchMeta.confidence ?? 0) * 100)}%
                        </div>
                      ) : null}
                    </div>

                    {item.matchMeta?.reason ? (
                      <p className="mt-2 text-xs text-marinha-600">{item.matchMeta.reason}</p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setDecisionAction(item.id, "link")}
                        className={`rounded-btn border px-3 py-2 text-xs font-semibold ${decision?.action === "link" ? "border-municipal-600 bg-municipal-600 text-white" : "border-marinha-900/10 bg-white text-marinha-700"}`}
                      >
                        Vincular
                      </button>
                      <button
                        type="button"
                        onClick={() => setDecisionAction(item.id, "create")}
                        className={`rounded-btn border px-3 py-2 text-xs font-semibold ${decision?.action === "create" ? "border-municipal-600 bg-municipal-600 text-white" : "border-marinha-900/10 bg-white text-marinha-700"}`}
                      >
                        Criar novo
                      </button>
                      <button
                        type="button"
                        onClick={() => setDecisionAction(item.id, "ignore")}
                        className={`rounded-btn border px-3 py-2 text-xs font-semibold ${decision?.action === "ignore" ? "border-municipal-600 bg-municipal-600 text-white" : "border-marinha-900/10 bg-white text-marinha-700"}`}
                      >
                        Ignorar
                      </button>
                    </div>

                    {decision?.action === "link" ? (
                      <div className="mt-3">
                        <label className="mb-1 block text-xs font-medium text-marinha-700">
                          Produto do catalogo
                        </label>
                        <select
                          value={decision.selectedProductId}
                          onChange={(event) => setDecisionProduct(item.id, event.target.value)}
                          className="w-full rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
                        >
                          <option value="">Selecione um produto</option>
                          {catalogOptions.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.sku} - {product.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    {decision?.action === "create" ? (
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <input
                          value={decision.createProduct.sku}
                          onChange={(event) => setDecisionDraftField(item.id, "sku", event.target.value)}
                          placeholder="SKU"
                          className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
                        />
                        <input
                          value={decision.createProduct.unit}
                          onChange={(event) => setDecisionDraftField(item.id, "unit", event.target.value)}
                          placeholder="Unidade"
                          className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
                        />
                        <input
                          value={decision.createProduct.name}
                          onChange={(event) => setDecisionDraftField(item.id, "name", event.target.value)}
                          placeholder="Nome do produto"
                          className="col-span-2 rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
                        />
                        <input
                          value={decision.createProduct.supplierCode}
                          onChange={(event) => setDecisionDraftField(item.id, "supplierCode", event.target.value)}
                          placeholder="Codigo do fornecedor"
                          className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
                        />
                        <input
                          value={decision.createProduct.barcode}
                          onChange={(event) => setDecisionDraftField(item.id, "barcode", event.target.value)}
                          placeholder="Codigo de barras"
                          className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
                        />
                        <input
                          value={decision.createProduct.ncm}
                          onChange={(event) => setDecisionDraftField(item.id, "ncm", event.target.value)}
                          placeholder="NCM"
                          className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
                        />
                        <input
                          value={decision.createProduct.cest}
                          onChange={(event) => setDecisionDraftField(item.id, "cest", event.target.value)}
                          placeholder="CEST"
                          className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
                        />
                        <input
                          value={decision.createProduct.cfopDefault}
                          onChange={(event) => setDecisionDraftField(item.id, "cfopDefault", event.target.value)}
                          placeholder="CFOP padrao"
                          className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
                        />
                        <input
                          value={decision.createProduct.originCode}
                          onChange={(event) => setDecisionDraftField(item.id, "originCode", event.target.value)}
                          placeholder="Origem"
                          className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
                        />
                        <input
                          type="number"
                          value={decision.createProduct.cost}
                          onChange={(event) => setDecisionDraftField(item.id, "cost", event.target.value)}
                          placeholder="Custo"
                          className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {importStep === 3 && xmlImport ? (
          <div className="space-y-4">
            <div className="rounded-btn border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
              <p className="font-semibold">Importacao aplicada ao catalogo</p>
              <p className="mt-1">
                Fornecedor: {xmlImport.supplierParty?.name ?? "Fornecedor"} | Itens conciliados:{" "}
                {xmlImport.items.filter((item) => item.action !== "ignore").length}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="primary"
                onClick={() => void createPurchaseOrderFromImport()}
                disabled={Boolean(createdPurchaseOrderId || xmlImport.purchaseOrderId) || isCreatingPurchaseOrder}
              >
                {isCreatingPurchaseOrder ? "Gerando..." : "Gerar pedido de compra"}
              </Button>
              {(createdPurchaseOrderId || xmlImport.purchaseOrderId) ? (
                <Link
                  href={`/erp/pedidos-compra?focus=${createdPurchaseOrderId ?? xmlImport.purchaseOrderId}`}
                  className="inline-flex min-h-[44px] items-center rounded-btn border border-marinha-900/20 px-4 py-2 text-sm font-semibold text-marinha-700 hover:bg-marinha-50"
                >
                  Abrir pedido gerado
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

        {importStep > 1 ? (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setImportStep((current) => (current === 3 ? 2 : 1))}
              className="text-sm font-medium text-marinha-600 hover:text-municipal-700"
            >
              Voltar
            </button>
          </div>
        ) : null}

        {importError ? <p className="mt-3 whitespace-pre-line text-sm text-red-600">{importError}</p> : null}
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
