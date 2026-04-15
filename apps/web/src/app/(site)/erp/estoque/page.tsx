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

type StockBalance = {
  id: string;
  productId: string;
  locationId: string;
  quantity: string;
  updatedAt: string;
  product?: { name: string; sku: string };
  location?: { name: string };
};

type StockMovement = {
  id: string;
  type: "in" | "out" | "adjust";
  productId: string;
  locationId: string;
  quantity: string;
  refType: string | null;
  note: string | null;
  createdAt: string;
  product?: { name: string; sku: string };
  location?: { name: string };
};

type StockLocation = {
  id: string;
  name: string;
  isDefault: boolean;
};

type Product = { id: string; name: string; sku: string };

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
    price?: string;
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
    stockPosted?: boolean;
    stockLocationId?: string | null;
    stockPostedAt?: string | null;
    stockCancelled?: boolean;
    stockCancelledAt?: string | null;
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
    price: string;
  };
};

const TAKE = 50;

const MOVE_LABELS: Record<string, string> = { in: "Entrada", out: "Saida", adjust: "Ajuste" };
const MOVE_COLORS: Record<string, string> = {
  in: "bg-green-100 text-green-700",
  out: "bg-red-100 text-red-700",
  adjust: "bg-yellow-100 text-yellow-700",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtMoney(value: string) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function shortDate(value: string | null | undefined) {
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
      price: item.draftProduct?.price ?? "0",
    },
  };
}

function importFieldLabel(
  key: keyof ImportDecision["createProduct"],
): string {
  return {
    sku: "SKU",
    unit: "Unidade",
    name: "Nome do produto",
    supplierCode: "Codigo do fornecedor",
    barcode: "Codigo de barras",
    ncm: "NCM",
    cest: "CEST",
    cfopDefault: "CFOP padrao",
    originCode: "Origem",
    cost: "Custo",
    price: "Preco de venda",
  }[key];
}

const balanceColumns: ErpColumn<StockBalance>[] = [
  {
    key: "product",
    label: "Produto",
    render: (r) =>
      r.product ? (
        <span>
          {r.product.name} <span className="font-mono text-xs text-marinha-500">({r.product.sku})</span>
        </span>
      ) : (
        r.productId
      ),
  },
  { key: "location", label: "Local", render: (r) => r.location?.name ?? r.locationId },
  { key: "quantity", label: "Quantidade", render: (r) => r.quantity },
  {
    key: "updatedAt",
    label: "Atualizado",
    render: (r) => <span className="text-xs text-marinha-500">{fmtDate(r.updatedAt)}</span>,
  },
];

const movementColumns: ErpColumn<StockMovement>[] = [
  {
    key: "createdAt",
    label: "Data",
    render: (r) => <span className="text-xs">{fmtDate(r.createdAt)}</span>,
  },
  {
    key: "type",
    label: "Tipo",
    render: (r) => (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${MOVE_COLORS[r.type]}`}>
        {MOVE_LABELS[r.type]}
      </span>
    ),
  },
  { key: "product", label: "Produto", render: (r) => r.product?.name ?? r.productId },
  { key: "quantity", label: "Qtd", render: (r) => r.quantity },
  { key: "refType", label: "Referencia", render: (r) => r.refType ?? "-" },
  { key: "note", label: "Obs.", render: (r) => r.note ?? "-" },
];

export default function ErpEstoquePage() {
  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [balancesLoading, setBalancesLoading] = useState(false);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [balancesError, setBalancesError] = useState<string | null>(null);
  const [movementsError, setMovementsError] = useState<string | null>(null);
  const [movHasMore, setMovHasMore] = useState(false);
  const [movSkip, setMovSkip] = useState(0);

  const [moveModal, setMoveModal] = useState(false);
  const [locationModal, setLocationModal] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const [moveForm, setMoveForm] = useState({
    type: "in" as "in" | "out" | "adjust",
    productId: "",
    locationId: "",
    quantity: "",
    note: "",
  });
  const [locationForm, setLocationForm] = useState({ name: "", isDefault: false });
  const [moveError, setMoveError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isMoveSubmitting, setIsMoveSubmitting] = useState(false);
  const [isLocSubmitting, setIsLocSubmitting] = useState(false);

  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImportSubmitting, setIsImportSubmitting] = useState(false);
  const [isImportApplying, setIsImportApplying] = useState(false);
  const [isCreatingPurchaseOrder, setIsCreatingPurchaseOrder] = useState(false);
  const [isCancellingImportEntry, setIsCancellingImportEntry] = useState(false);
  const [xmlImport, setXmlImport] = useState<XmlImportDetail | null>(null);
  const [importDecisions, setImportDecisions] = useState<Record<string, ImportDecision>>({});
  const [createdPurchaseOrderId, setCreatedPurchaseOrderId] = useState<string | null>(null);
  const [launchStockFromImport, setLaunchStockFromImport] = useState(true);
  const [importStockLocationId, setImportStockLocationId] = useState("");

  const businessId = useSelectedBusinessId();
  const noBusinessId = !businessId;

  const loadBalances = useCallback(async () => {
    setBalancesLoading(true);
    setBalancesError(null);
    const res = await erpFetch<StockBalance[]>("/api/v1/erp/stock/balances");
    if (res.ok && res.data) setBalances(res.data);
    else setBalancesError(res.error ?? "Erro ao carregar saldos.");
    setBalancesLoading(false);
  }, []);

  const loadMovements = useCallback(
    async (reset = false) => {
      setMovementsLoading(true);
      setMovementsError(null);
      const currentSkip = reset ? 0 : movSkip;
      const res = await erpFetch<ErpListResponse<StockMovement>>(
        `/api/v1/erp/stock/movements?take=${TAKE}&skip=${currentSkip}`,
      );
      if (res.ok && res.data) {
        const { items, total } = res.data;
        setMovements((prev) => (reset ? items : [...prev, ...items]));
        setMovSkip(currentSkip + items.length);
        setMovHasMore(currentSkip + items.length < total);
      } else {
        setMovementsError(res.error ?? "Erro ao carregar movimentacoes.");
      }
      setMovementsLoading(false);
    },
    [movSkip],
  );

  const loadLocations = useCallback(async () => {
    const res = await erpFetch<StockLocation[]>("/api/v1/erp/stock/locations");
    if (res.ok && res.data) setLocations(res.data);
  }, []);

  const loadProducts = useCallback(async () => {
    const res = await erpFetch<ErpListResponse<Product>>("/api/v1/erp/products?take=200&skip=0");
    if (res.ok && res.data) setProducts(res.data.items);
  }, []);

  useEffect(() => {
    if (noBusinessId) {
      setBalances([]);
      setMovements([]);
      setLocations([]);
      setProducts([]);
      setMovHasMore(false);
      setMovSkip(0);
      return;
    }
    void loadBalances();
    void loadMovements(true);
    void loadLocations();
    void loadProducts();
  }, [businessId, loadBalances, loadLocations, loadMovements, loadProducts, noBusinessId]);

  const openImportModal = () => {
    setImportOpen(true);
    setImportStep(1);
    setImportFile(null);
    setImportError(null);
    setXmlImport(null);
    setImportDecisions({});
    setCreatedPurchaseOrderId(null);
    setLaunchStockFromImport(true);
    setImportStockLocationId(locations.find((location) => location.isDefault)?.id ?? "");
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
        ? "Revisar entrada por XML"
        : "Resumo da entrada";

  const importSubmitLabel =
    importStep === 1 ? "Ler XML" : importStep === 2 ? "Aplicar entrada" : "Concluir";

  const handleMoveSubmit = async () => {
    if (!moveForm.productId || !moveForm.locationId || !moveForm.quantity) {
      setMoveError("Produto, local e quantidade sao obrigatorios.");
      return;
    }
    setIsMoveSubmitting(true);
    setMoveError(null);
    const res = await erpFetch<StockMovement>("/api/v1/erp/stock/movements", {
      method: "POST",
      body: JSON.stringify({
        type: moveForm.type,
        productId: moveForm.productId,
        locationId: moveForm.locationId,
        quantity: moveForm.quantity,
        ...(moveForm.note ? { note: moveForm.note } : {}),
      }),
    });
    if (res.ok) {
      setMoveModal(false);
      void loadBalances();
      void loadMovements(true);
    } else {
      setMoveError(res.error ?? "Erro ao registrar movimentacao.");
    }
    setIsMoveSubmitting(false);
  };

  const handleLocationSubmit = async () => {
    if (!locationForm.name.trim()) {
      setLocationError("Nome e obrigatorio.");
      return;
    }
    setIsLocSubmitting(true);
    setLocationError(null);
    const res = await erpFetch<StockLocation>("/api/v1/erp/stock/locations", {
      method: "POST",
      body: JSON.stringify(locationForm),
    });
    if (res.ok && res.data) {
      setLocations((prev) => [...prev, res.data!]);
      setLocationModal(false);
    } else {
      setLocationError(res.error ?? "Erro ao criar local.");
    }
    setIsLocSubmitting(false);
  };

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
            launchStockNow: launchStockFromImport,
            stockLocationId: launchStockFromImport ? importStockLocationId || undefined : undefined,
          }),
        },
      );
      setIsImportApplying(false);
      if (!res.ok || !res.data) {
        setImportError(res.error ?? "Nao foi possivel aplicar a entrada.");
        return;
      }
      setXmlImport(res.data);
      setImportStep(3);
      void loadBalances();
      void loadMovements(true);
      void loadProducts();
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

  async function cancelImportStockEntry() {
    if (!xmlImport) return;
    const confirmed = confirm(
      "Cancelar a entrada de estoque desta NF-e? O sistema vai estornar as quantidades lancadas por esta importacao.",
    );
    if (!confirmed) {
      return;
    }
    setIsCancellingImportEntry(true);
    setImportError(null);
    const res = await erpFetch<XmlImportDetail>(
      `/api/v1/erp/products/xml-imports/${xmlImport.id}/cancel-stock-entry`,
      { method: "POST" },
    );
    setIsCancellingImportEntry(false);
    if (!res.ok || !res.data) {
      setImportError(res.error ?? "Nao foi possivel cancelar a entrada desta NF-e.");
      return;
    }
    setXmlImport(res.data);
    void loadBalances();
    void loadMovements(true);
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

  const sel = (
    value: string,
    onChange: (v: string) => void,
    options: { value: string; label: string }[],
  ) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
    >
      <option value="">- Selecione -</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  const field = (label: string, el: React.ReactNode) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-marinha-700">{label}</label>
      {el}
    </div>
  );

  return (
    <>
      <PageIntro
        title="Estoque"
        description="Acompanhe saldos, movimentações e entradas de mercadoria com visão clara dos produtos e fornecedores."
        badge="Operação"
      />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card variant="featured">
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Saldos</p>
          <p className="mt-2 text-lg font-bold text-marinha-900">{balances.length} posições</p>
          <p className="mt-1 text-sm text-marinha-500">Itens com saldo registrado por local.</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Movimentações</p>
          <p className="mt-2 text-lg font-bold text-marinha-900">{movements.length} registros</p>
          <p className="mt-1 text-sm text-marinha-500">Histórico recente de entradas, saídas e ajustes.</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Locais</p>
          <p className="mt-2 text-lg font-bold text-marinha-900">{locations.length} locais cadastrados</p>
          <p className="mt-1 text-sm text-marinha-500">Organize o estoque por depósito, loja ou almoxarifado.</p>
        </Card>
      </div>

      <div className="mb-4 rounded-btn border border-cerrado-500/25 bg-cerrado-500/10 px-4 py-3 text-sm text-marinha-700">
        A entrada por XML fica no estoque porque essa rotina pode atualizar produtos, identificar o fornecedor e,
        se você quiser, <strong>lançar o saldo imediatamente</strong> a partir da nota.
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <Button variant="primary" onClick={openImportModal} disabled={noBusinessId}>
          Importar XML
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setMoveForm({ type: "in", productId: "", locationId: "", quantity: "", note: "" });
            setMoveError(null);
            setMoveModal(true);
          }}
          disabled={noBusinessId}
        >
          Nova movimentação
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setLocationForm({ name: "", isDefault: false });
            setLocationError(null);
            setLocationModal(true);
          }}
          disabled={noBusinessId}
        >
          Novo local
        </Button>
        <Badge tone="accent" className="self-center">Rotina diária</Badge>
      </div>

      <Card className="mb-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg font-bold text-marinha-900">Saldos por produto</h2>
            <p className="mt-1 text-sm text-marinha-500">Consulte rapidamente onde cada item está armazenado e em qual quantidade.</p>
          </div>
          <Badge tone="neutral">Saldo atual</Badge>
        </div>
        <ErpDataTable
          columns={balanceColumns}
          data={balances}
          isLoading={balancesLoading}
          error={balancesError}
          emptyMessage="Nenhum saldo de estoque registrado ainda."
          onRetry={loadBalances}
          keyExtractor={(r) => r.id}
        />
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg font-bold text-marinha-900">Movimentações</h2>
            <p className="mt-1 text-sm text-marinha-500">Acompanhe entradas, saídas e ajustes registrados no estoque.</p>
          </div>
          <Badge tone="warning">Histórico</Badge>
        </div>
        <ErpDataTable
          columns={movementColumns}
          data={movements}
          isLoading={movementsLoading}
          error={movementsError}
          emptyMessage="Nenhuma movimentação registrada ainda."
          onRetry={() => loadMovements(true)}
          keyExtractor={(r) => r.id}
          hasMore={movHasMore}
          onLoadMore={() => loadMovements(false)}
        />
      </Card>

      <ErpFormModal
        title={importModalTitle}
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSubmit={() => void handleImportSubmit()}
        isSubmitting={isImportSubmitting || isImportApplying}
        submitLabel={importSubmitLabel}
        size="wide"
      >
        {importStep === 1 ? (
          <>
            <p className="mb-4 text-sm text-marinha-500">
              Envie o XML da nota de entrada. O sistema vai ler o fornecedor, os itens e sugerir
              como aproveitar o cadastro já existente antes de atualizar o estoque.
            </p>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-marinha-700">Arquivo XML</label>
              <input
                type="file"
                accept=".xml,text/xml,application/xml"
                onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm"
              />
              {importFile ? <p className="text-xs text-marinha-500">Arquivo selecionado: {importFile.name}</p> : null}
            </div>
          </>
        ) : null}

        {importStep === 2 && xmlImport ? (
          <div className="space-y-4">
            <div className="rounded-btn border border-marinha-900/10 bg-marinha-900/5 px-4 py-3">
              <p className="text-sm font-semibold text-marinha-900">
                NF-e {xmlImport.invoiceNumber ?? "-"} série {xmlImport.invoiceSeries ?? "-"}
              </p>
              <p className="mt-1 text-xs text-marinha-600">Chave: {xmlImport.accessKey}</p>
              <p className="mt-1 text-xs text-marinha-600">
                Emissão: {shortDate(xmlImport.issuedAt)} | Total: {fmtMoney(xmlImport.summary?.totalAmount ?? "0")}
              </p>
            </div>

            <div className="rounded-btn border border-green-200 bg-green-50 px-4 py-3">
              <p className="text-sm font-semibold text-green-900">Fornecedor identificado automaticamente</p>
              <p className="mt-1 text-sm text-green-800">{xmlImport.supplierParty?.name ?? "Fornecedor"}</p>
              <p className="mt-1 text-xs text-green-800">
                Documento: {xmlImport.supplierParty?.document ?? "-"} | IE: {xmlImport.supplierParty?.stateRegistration ?? "-"}
              </p>
            </div>

            <div className="rounded-btn border border-marinha-900/10 bg-cerrado-500/5 px-4 py-3">
              <p className="text-sm font-semibold text-marinha-900">Como finalizar esta entrada</p>
              <label className="mt-3 flex items-center gap-2 text-sm text-marinha-700">
                <input
                  type="checkbox"
                  checked={launchStockFromImport}
                  onChange={(event) => setLaunchStockFromImport(event.target.checked)}
                />
                Lançar estoque agora a partir desta NF-e
              </label>
              {launchStockFromImport ? (
                <div className="mt-3">
                  <label className="mb-1 block text-xs font-medium text-marinha-700">Local do estoque</label>
                  <select
                    value={importStockLocationId}
                    onChange={(event) => setImportStockLocationId(event.target.value)}
                    className="w-full rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
                  >
                    <option value="">Usar local padrão</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                        {location.isDefault ? " (padrão)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="mt-2 text-xs text-marinha-600">
                  O XML vai atualizar o cadastro dos produtos agora, e você poderá gerar um pedido de compra depois.
                </p>
              )}
            </div>

            <div className="rounded-btn border border-marinha-900/10 bg-white px-4 py-3">
              <p className="text-sm font-semibold text-marinha-900">Resumo da revisão</p>
              <p className="mt-2 text-xs text-marinha-600">
                Vincular: {importSummary.link} | Criar: {importSummary.create} | Ignorar: {importSummary.ignore}
              </p>
            </div>

            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
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
                          Cód. fornecedor: {item.supplierCode ?? "-"} | EAN: {item.barcode ?? "-"} | Unidade: {item.unit ?? "-"}
                        </p>
                        <p className="mt-1 text-xs text-marinha-500">
                          Qtd: {item.qty} | Custo unit.: {fmtMoney(item.unitPrice)} | Total: {fmtMoney(item.totalPrice)}
                        </p>
                      </div>
                      {item.matchMeta?.reason ? (
                        <div className="rounded-full bg-cerrado-500/10 px-3 py-1 text-xs font-semibold text-marinha-700">
                          Sugestão {Math.round((item.matchMeta.confidence ?? 0) * 100)}%
                        </div>
                      ) : null}
                    </div>

                    {item.matchMeta?.reason ? <p className="mt-2 text-xs text-marinha-600">{item.matchMeta.reason}</p> : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {(["link", "create", "ignore"] as const).map((action) => (
                        <button
                          key={action}
                          type="button"
                          onClick={() => setDecisionAction(item.id, action)}
                          className={`rounded-btn border px-3 py-2 text-xs font-semibold ${
                            decision?.action === action
                              ? "border-municipal-600 bg-municipal-600 text-white"
                              : "border-marinha-900/10 bg-white text-marinha-700"
                          }`}
                        >
                          {action === "link" ? "Vincular" : action === "create" ? "Criar novo" : "Ignorar"}
                        </button>
                      ))}
                    </div>

                    {decision?.action === "link" ? (
                      <div className="mt-3">
                        <label className="mb-1 block text-xs font-medium text-marinha-700">Produto do catálogo</label>
                        <select
                          value={decision.selectedProductId}
                          onChange={(event) => setDecisionProduct(item.id, event.target.value)}
                          className="w-full rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
                        >
                          <option value="">Selecione um produto</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.sku} - {product.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    {decision?.action === "create" ? (
                      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {(["sku", "unit", "name", "supplierCode", "barcode", "ncm", "cest", "cfopDefault", "originCode", "cost", "price"] as const).map(
                          (fieldKey) => (
                            <div key={fieldKey} className={fieldKey === "name" ? "md:col-span-2 xl:col-span-3" : ""}>
                              <label className="mb-1 block text-xs font-medium text-marinha-700">
                                {importFieldLabel(fieldKey)}
                              </label>
                              <input
                                type={fieldKey === "cost" || fieldKey === "price" ? "number" : "text"}
                                value={decision.createProduct[fieldKey]}
                                onChange={(event) => setDecisionDraftField(item.id, fieldKey, event.target.value)}
                                placeholder={importFieldLabel(fieldKey)}
                                className="w-full rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
                              />
                            </div>
                          ),
                        )}
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
              <p className="font-semibold">
                {xmlImport.summary?.stockPosted ? "Entrada aplicada ao estoque" : "Cadastro atualizado pelo XML"}
              </p>
              <p className="mt-1">
                Fornecedor: {xmlImport.supplierParty?.name ?? "Fornecedor"} | Itens conciliados:{" "}
                {xmlImport.items.filter((item) => item.action !== "ignore").length}
              </p>
            </div>

            {xmlImport.summary?.stockCancelled ? (
              <div className="rounded-btn border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                A entrada de estoque desta NF-e foi cancelada. O cadastro dos produtos continua atualizado, mas o saldo foi estornado.
              </div>
            ) : null}

            {xmlImport.summary?.stockPosted ? (
              <div className="space-y-3">
                <div className="rounded-btn border border-marinha-900/10 bg-white px-4 py-3 text-sm text-marinha-700">
                  O saldo ja foi lancado no estoque desta empresa com referencia a esta NF-e.
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void cancelImportStockEntry()}
                  disabled={isCancellingImportEntry}
                >
                  {isCancellingImportEntry ? "Cancelando entrada..." : "Cancelar entrada desta NF-e"}
                </Button>
              </div>
            ) : (
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
            )}
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
        title="Nova movimentacao"
        open={moveModal}
        onClose={() => setMoveModal(false)}
        onSubmit={handleMoveSubmit}
        isSubmitting={isMoveSubmitting}
      >
        <div className="grid grid-cols-2 gap-4">
          {field(
            "Tipo *",
            sel(moveForm.type, (v) => setMoveForm((f) => ({ ...f, type: v as "in" | "out" | "adjust" })), [
              { value: "in", label: "Entrada" },
              { value: "out", label: "Saida" },
              { value: "adjust", label: "Ajuste (saldo absoluto)" },
            ]),
          )}
          {field(
            "Produto *",
            sel(moveForm.productId, (v) => setMoveForm((f) => ({ ...f, productId: v })), products.map((p) => ({
              value: p.id,
              label: `${p.sku} - ${p.name}`,
            }))),
          )}
          {field(
            "Local *",
            sel(moveForm.locationId, (v) => setMoveForm((f) => ({ ...f, locationId: v })), locations.map((l) => ({
              value: l.id,
              label: l.name + (l.isDefault ? " (padrao)" : ""),
            }))),
          )}
          {field(
            "Quantidade *",
            <input
              type="number"
              min="0.0001"
              step="0.0001"
              value={moveForm.quantity}
              onChange={(e) => setMoveForm((f) => ({ ...f, quantity: e.target.value }))}
              className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
            />,
          )}
          <div className="col-span-2">
            {field(
              "Observacao",
              <input
                type="text"
                value={moveForm.note}
                onChange={(e) => setMoveForm((f) => ({ ...f, note: e.target.value }))}
                className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
              />,
            )}
          </div>
        </div>
        {moveError ? <p className="mt-3 text-sm text-red-600">{moveError}</p> : null}
      </ErpFormModal>

      <ErpFormModal
        title="Novo local de estoque"
        open={locationModal}
        onClose={() => setLocationModal(false)}
        onSubmit={handleLocationSubmit}
        isSubmitting={isLocSubmitting}
      >
        <div className="flex flex-col gap-4">
          {field(
            "Nome *",
            <input
              type="text"
              value={locationForm.name}
              onChange={(e) => setLocationForm((f) => ({ ...f, name: e.target.value }))}
              className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
            />,
          )}
          <label className="flex items-center gap-2 text-sm text-marinha-700">
            <input
              type="checkbox"
              checked={locationForm.isDefault}
              onChange={(e) => setLocationForm((f) => ({ ...f, isDefault: e.target.checked }))}
            />
            Definir como local padrao
          </label>
        </div>
        {locationError ? <p className="mt-3 text-sm text-red-600">{locationError}</p> : null}
      </ErpFormModal>
    </>
  );
}
