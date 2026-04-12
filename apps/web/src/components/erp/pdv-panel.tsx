"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ErpFiscalEmitModal } from "@/components/erp/erp-fiscal-emit-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { erpFetch } from "@/lib/api-browser";
import { cn } from "@/lib/cn";
import { printSalesReceipt, RECEIPT_PAYMENT_OPTIONS } from "@/lib/erp-sales-receipt";
import type { ErpListResponse } from "@/lib/erp-list";

type PaymentMethod = "cash" | "credit_card" | "debit_card" | "pix" | "other";
type CustomerMode = "consumer" | "cpf";

type ApiProduct = {
  id: string;
  name: string;
  sku: string;
  price: string;
  barcode: string | null;
  isActive: boolean;
};

type Product = {
  id: string;
  name: string;
  price: number;
  barcode: string;
  sku: string;
};

type Line = {
  product: Product;
  qty: number;
};

type PartySummary = {
  id: string;
  name: string;
  document: string | null;
  phone?: string | null;
  email?: string | null;
};

type SaleOrderDetail = {
  id: string;
  status: "draft" | "confirmed" | "cancelled";
  fiscalStatus: "none" | "pending" | "authorized" | "cancelled" | "error";
  fiscalDocumentType: "nfce" | "nfe" | "nfse" | null;
  paymentMethod: PaymentMethod | null;
  totalAmount: string;
  createdAt: string;
  party?: PartySummary | null;
  items?: Array<{
    qty: string;
    unitPrice: string;
    product?: {
      name: string;
      sku: string;
    } | null;
  }>;
};

const fmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const PAYMENT_OPTIONS = RECEIPT_PAYMENT_OPTIONS;

function normalizeDocument(value: string) {
  return value.replace(/\D/g, "");
}

function formatCpf(value: string) {
  const digits = normalizeDocument(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function mapProduct(product: ApiProduct): Product {
  return {
    id: product.id,
    name: product.name,
    price: Number(product.price),
    barcode: product.barcode ?? "",
    sku: product.sku,
  };
}

export function PdvPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [customerMode, setCustomerMode] = useState<CustomerMode>("consumer");
  const [customerDocument, setCustomerDocument] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<PartySummary | null>(null);
  const [customerLookupMessage, setCustomerLookupMessage] = useState<string | null>(null);
  const [isLookingUpCustomer, setIsLookingUpCustomer] = useState(false);
  const [quickCustomerName, setQuickCustomerName] = useState("");
  const [quickCustomerPhone, setQuickCustomerPhone] = useState("");
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [saleError, setSaleError] = useState<string | null>(null);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
  const [lastSale, setLastSale] = useState<SaleOrderDetail | null>(null);
  const [fiscalModalOpen, setFiscalModalOpen] = useState(false);

  useEffect(() => {
    async function loadProducts() {
      setIsLoadingProducts(true);
      setLoadError(null);
      const res = await erpFetch<ErpListResponse<ApiProduct>>(
        "/api/v1/erp/products?take=100&skip=0",
      );
      if (res.ok && res.data?.items) {
        setProducts(res.data.items.filter((item) => item.isActive).map(mapProduct));
      } else {
        setLoadError(res.error ?? "Erro ao carregar produtos.");
      }
      setIsLoadingProducts(false);
    }

    void loadProducts();
  }, []);

  const productsByBarcode = useMemo(
    () =>
      Object.fromEntries(
        products.filter((product) => product.barcode).map((product) => [product.barcode, product]),
      ),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(normalized) ||
        product.sku.toLowerCase().includes(normalized) ||
        (product.barcode && product.barcode.includes(normalized.replace(/\D/g, ""))),
    );
  }, [products, query]);

  const addLine = useCallback((product: Product) => {
    setLines((prev) => {
      const index = prev.findIndex((line) => line.product.id === product.id);
      if (index === -1) {
        return [...prev, { product, qty: 1 }];
      }
      const next = [...prev];
      next[index] = { ...next[index], qty: next[index].qty + 1 };
      return next;
    });
    setLastSaleId(null);
  }, []);

  function tryAddByBarcode(raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 4) return false;
    const product = productsByBarcode[digits];
    if (!product) return false;
    addLine(product);
    setBarcodeInput("");
    return true;
  }

  function onBarcodeKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    tryAddByBarcode(barcodeInput);
  }

  function setQty(productId: string, qty: number) {
    if (qty < 1) {
      setLines((prev) => prev.filter((line) => line.product.id !== productId));
      return;
    }
    setLines((prev) =>
      prev.map((line) =>
        line.product.id === productId ? { ...line, qty } : line,
      ),
    );
  }

  const subtotal = lines.reduce(
    (sum, line) => sum + line.product.price * line.qty,
    0,
  );
  const totalItems = lines.reduce((sum, line) => sum + line.qty, 0);

  const printReceipt = useCallback(() => {
    if (!lastSale) return;
    const ok = printSalesReceipt(lastSale);
    if (!ok) {
      setSaleError("Nao foi possivel abrir a janela de impressao do recibo.");
    }
  }, [lastSale, setSaleError]);

  const lookupCustomerByDocument = useCallback(async () => {
    const normalized = normalizeDocument(customerDocument);
    if (normalized.length !== 11) {
      setSelectedCustomer(null);
      setCustomerLookupMessage("Informe um CPF com 11 numeros.");
      return null;
    }

    setIsLookingUpCustomer(true);
    setCustomerLookupMessage(null);

    const res = await erpFetch<PartySummary | null>(
      `/api/v1/erp/parties/lookup-by-document?document=${normalized}`,
    );

    setIsLookingUpCustomer(false);

    if (!res.ok) {
      setSelectedCustomer(null);
      setCustomerLookupMessage(res.error ?? "Nao foi possivel buscar o CPF.");
      return null;
    }

    if (res.data) {
      setSelectedCustomer(res.data);
      setQuickCustomerName(res.data.name);
      setQuickCustomerPhone(res.data.phone ?? "");
      setCustomerLookupMessage(`Cliente encontrado: ${res.data.name}.`);
      return res.data;
    }

    setSelectedCustomer(null);
    setQuickCustomerName("");
    setCustomerLookupMessage("CPF nao encontrado. Cadastre rapidamente para identificar a venda.");
    return null;
  }, [customerDocument]);

  const createQuickCustomer = useCallback(async () => {
    const normalized = normalizeDocument(customerDocument);
    if (normalized.length !== 11) {
      setCustomerLookupMessage("Informe um CPF com 11 numeros.");
      return null;
    }
    if (quickCustomerName.trim().length < 2) {
      setCustomerLookupMessage("Informe o nome do cliente para o cadastro rapido.");
      return null;
    }

    setIsCreatingCustomer(true);
    setCustomerLookupMessage(null);

    const res = await erpFetch<PartySummary>("/api/v1/erp/parties", {
      method: "POST",
      body: JSON.stringify({
        type: "customer",
        name: quickCustomerName.trim(),
        document: normalized,
        phone: quickCustomerPhone.trim() || undefined,
        taxpayerType: "final_consumer",
      }),
    });

    setIsCreatingCustomer(false);

    if (!res.ok || !res.data) {
      setCustomerLookupMessage(res.error ?? "Nao foi possivel criar o cliente rapidamente.");
      return null;
    }

    setSelectedCustomer(res.data);
    setQuickCustomerName(res.data.name);
    setQuickCustomerPhone(res.data.phone ?? "");
    setCustomerLookupMessage(`Cliente cadastrado: ${res.data.name}.`);
    return res.data;
  }, [customerDocument, quickCustomerName, quickCustomerPhone]);

  const finalizeSale = useCallback(async () => {
    if (lines.length === 0) return;

    let partyId: string | undefined;

    if (customerMode === "cpf") {
      const normalized = normalizeDocument(customerDocument);
      if (normalized.length !== 11) {
        setSaleError("Informe um CPF valido ou escolha a opcao consumidor final.");
        return;
      }

      let customer = selectedCustomer;
      if (!customer || normalizeDocument(customer.document ?? "") !== normalized) {
        customer = await lookupCustomerByDocument();
      }

      if (!customer) {
        customer = await createQuickCustomer();
      }

      if (!customer) {
        setSaleError("Nao foi possivel identificar o cliente pelo CPF informado.");
        return;
      }

      partyId = customer.id;
    }

    setIsSaving(true);
    setSaleError(null);
    setLastSaleId(null);
    setLastSale(null);

    const createRes = await erpFetch<SaleOrderDetail>("/api/v1/erp/sales-orders", {
      method: "POST",
      body: JSON.stringify({
        source: "pdv",
        paymentMethod,
        partyId,
        items: lines.map((line) => ({
          productId: line.product.id,
          qty: String(line.qty),
          unitPrice: String(line.product.price),
        })),
      }),
    });

    if (!createRes.ok || !createRes.data) {
      setSaleError(createRes.error ?? "Erro ao registrar venda.");
      setIsSaving(false);
      return;
    }

    const confirmRes = await erpFetch<SaleOrderDetail>(
      `/api/v1/erp/sales-orders/${createRes.data.id}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status: "confirmed" }),
      },
    );

    if (!confirmRes.ok || !confirmRes.data) {
      setSaleError(
        confirmRes.error ??
          `Venda criada como pedido ${createRes.data.id.slice(0, 8).toUpperCase()}, mas nao foi possivel confirmar automaticamente.`,
      );
      setIsSaving(false);
      return;
    }

    setLastSaleId(confirmRes.data.id);
    setLastSale(confirmRes.data);
    setLines([]);
    setIsSaving(false);
  }, [
    createQuickCustomer,
    customerDocument,
    customerMode,
    lines,
    lookupCustomerByDocument,
    paymentMethod,
    selectedCustomer,
  ]);

  return (
    <>
      <div className="flex flex-col gap-3 lg:gap-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card variant="featured">
            <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">
              Cupom atual
            </p>
            <p className="mt-2 text-lg font-bold text-marinha-900">
              {totalItems} item(ns)
            </p>
            <p className="mt-1 text-sm text-marinha-500">
              Itens adicionados no atendimento atual.
            </p>
          </Card>
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">
              Total da venda
            </p>
            <p className="mt-2 text-lg font-bold text-marinha-900">
              {fmt.format(subtotal)}
            </p>
            <p className="mt-1 text-sm text-marinha-500">
              Valor acumulado do cupom antes da confirmacao.
            </p>
          </Card>
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">
              Fluxo do caixa
            </p>
            <p className="mt-2 flex items-center gap-2 text-lg font-bold text-marinha-900">
              <Badge tone="accent">PDV</Badge>
              Venda confirmada com escolha fiscal
            </p>
            <p className="mt-1 text-sm text-marinha-500">
              Registre a venda primeiro e depois decida se quer emitir NFC-e ou só imprimir um recibo não fiscal.
            </p>
          </Card>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
          <div className="min-w-0 flex-1">
            <label
              htmlFor="pdv-barcode"
              className="mb-1 block text-xs font-semibold text-marinha-600"
            >
              Codigo de barras
            </label>
            <Input
              id="pdv-barcode"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Bipe ou digite + Enter"
              value={barcodeInput}
              onChange={(event) => setBarcodeInput(event.target.value)}
              onKeyDown={onBarcodeKeyDown}
              className="min-h-[44px] font-mono text-base tracking-wide"
            />
          </div>
          <div className="w-full sm:max-w-xs">
            <label className="mb-1 block text-xs font-semibold text-marinha-600">
              Pagamento
            </label>
            <select
              value={paymentMethod}
              onChange={(event) =>
                setPaymentMethod(event.target.value as PaymentMethod)
              }
              className="focus-ring min-h-[44px] w-full rounded-btn border border-marinha-900/20 bg-white px-3 py-2 text-sm text-marinha-900"
            >
              {PAYMENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Card>
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">
                Identificacao do comprador
              </p>
              <p className="mt-1 text-sm text-marinha-500">
                Escolha se a venda vai como consumidor final ou com CPF identificado no caixa.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setCustomerMode("consumer");
                  setSelectedCustomer(null);
                  setCustomerLookupMessage("Venda sem CPF: consumidor final.");
                }}
                className={cn(
                  "focus-ring rounded-btn border px-3 py-3 text-left text-sm font-semibold transition-colors",
                  customerMode === "consumer"
                    ? "border-municipal-600 bg-municipal-600 text-white"
                    : "border-marinha-900/10 bg-white text-marinha-700 hover:border-municipal-600/35 hover:text-municipal-800",
                )}
              >
                Consumidor final
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomerMode("cpf");
                  setCustomerLookupMessage(null);
                }}
                className={cn(
                  "focus-ring rounded-btn border px-3 py-3 text-left text-sm font-semibold transition-colors",
                  customerMode === "cpf"
                    ? "border-municipal-600 bg-municipal-600 text-white"
                    : "border-marinha-900/10 bg-white text-marinha-700 hover:border-municipal-600/35 hover:text-municipal-800",
                )}
              >
                Informar CPF
              </button>
            </div>

            {customerMode === "cpf" ? (
              <div className="grid gap-3 md:grid-cols-[1.1fr,auto]">
                <div>
                  <label
                    htmlFor="pdv-customer-document"
                    className="mb-1 block text-xs font-semibold text-marinha-600"
                  >
                    CPF do cliente
                  </label>
                  <Input
                    id="pdv-customer-document"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="000.000.000-00"
                    value={customerDocument}
                    onChange={(event) => {
                      setCustomerDocument(formatCpf(event.target.value));
                      setSelectedCustomer(null);
                      setCustomerLookupMessage(null);
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="md:self-end"
                  disabled={isLookingUpCustomer}
                  onClick={() => void lookupCustomerByDocument()}
                >
                  {isLookingUpCustomer ? "Buscando..." : "Buscar CPF"}
                </Button>
              </div>
            ) : null}

            {customerMode === "cpf" && selectedCustomer ? (
              <div className="rounded-btn border border-green-200 bg-green-50 px-3 py-3 text-sm text-green-800">
                <p className="font-semibold">{selectedCustomer.name}</p>
                <p className="mt-1">
                  CPF identificado: {selectedCustomer.document ?? normalizeDocument(customerDocument)}
                </p>
              </div>
            ) : null}

            {customerMode === "cpf" && !selectedCustomer && normalizeDocument(customerDocument).length === 11 ? (
              <div className="grid gap-3 rounded-btn border border-marinha-900/10 bg-white/80 p-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <p className="text-sm font-semibold text-marinha-900">Cadastro rapido</p>
                  <p className="mt-1 text-xs text-marinha-500">
                    Se o CPF nao existir ainda, cadastre o cliente em poucos segundos e finalize a venda.
                  </p>
                </div>
                <div>
                  <label
                    htmlFor="pdv-quick-customer-name"
                    className="mb-1 block text-xs font-semibold text-marinha-600"
                  >
                    Nome do cliente
                  </label>
                  <Input
                    id="pdv-quick-customer-name"
                    placeholder="Nome completo"
                    value={quickCustomerName}
                    onChange={(event) => setQuickCustomerName(event.target.value)}
                  />
                </div>
                <div>
                  <label
                    htmlFor="pdv-quick-customer-phone"
                    className="mb-1 block text-xs font-semibold text-marinha-600"
                  >
                    Telefone
                  </label>
                  <Input
                    id="pdv-quick-customer-phone"
                    inputMode="tel"
                    placeholder="Opcional"
                    value={quickCustomerPhone}
                    onChange={(event) => setQuickCustomerPhone(event.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isCreatingCustomer}
                    onClick={() => void createQuickCustomer()}
                  >
                    {isCreatingCustomer ? "Cadastrando..." : "Cadastrar cliente rapido"}
                  </Button>
                </div>
              </div>
            ) : null}

            <p className="text-xs text-marinha-500">
              {customerMode === "consumer"
                ? "Sem CPF informado, a venda fica como consumidor final."
                : "Com CPF informado, o recibo e a NFC-e podem sair identificados com o cliente."}
            </p>

            {customerLookupMessage ? (
              <p className="text-xs text-marinha-600">{customerLookupMessage}</p>
            ) : null}
          </div>
        </Card>

        <div
          className={cn(
            "flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6",
            "min-h-0 lg:min-h-[min(70vh,720px)]",
          )}
        >
          <section className="min-w-0 flex-1 space-y-3" aria-label="Catalogo de produtos">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-serif text-lg text-marinha-900">
                  Catalogo rapido
                </h2>
                <p className="mt-1 text-sm text-marinha-500">
                  Encontre produtos pelo nome, SKU ou codigo de barras.
                </p>
              </div>
              <div className="w-full sm:max-w-md">
                <label htmlFor="pdv-search" className="sr-only">
                  Buscar produto
                </label>
                <Input
                  id="pdv-search"
                  type="search"
                  placeholder="Buscar nome, SKU ou EAN..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-full"
                  autoComplete="off"
                />
              </div>
            </div>

            {isLoadingProducts ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-[72px] animate-pulse rounded-btn bg-marinha-900/8"
                  />
                ))}
              </div>
            ) : loadError ? (
              <p className="text-sm text-red-600">{loadError}</p>
            ) : (
              <div
                className={cn(
                  "grid gap-2 sm:gap-3",
                  "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4",
                )}
              >
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addLine(product)}
                    className={cn(
                      "focus-ring flex min-h-[52px] flex-col items-start justify-center rounded-btn border border-marinha-900/10",
                      "bg-surface-card p-3 text-left shadow-card transition hover:border-municipal-600/35 hover:shadow-card-hover",
                      "active:scale-[0.99] touch-manipulation",
                    )}
                  >
                    <span className="font-mono text-[10px] leading-none text-marinha-500">
                      {product.sku}
                    </span>
                    <span className="mt-1 text-sm font-semibold leading-tight text-marinha-900">
                      {product.name}
                    </span>
                    <span className="mt-1 text-sm font-bold text-municipal-800">
                      {fmt.format(product.price)}
                    </span>
                  </button>
                ))}
                {filteredProducts.length === 0 && (
                  <p className="col-span-full text-sm text-marinha-500">
                    {products.length === 0
                      ? "Nenhum produto ativo cadastrado. Adicione produtos no modulo Produtos."
                      : "Nenhum produto encontrado para esta busca."}
                  </p>
                )}
              </div>
            )}
          </section>

          <aside
            className={cn(
              "w-full shrink-0 lg:sticky lg:top-24 lg:w-[min(100%,22rem)] xl:w-[26rem]",
            )}
            aria-label="Cupom"
          >
            <Card variant="featured" className="flex flex-col p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-serif text-base font-bold text-marinha-900">
                    Cupom
                  </h2>
                  <p className="mt-1 text-xs text-marinha-500">
                    Resumo da venda atual no caixa.
                  </p>
                </div>
                <Badge tone="neutral">Venda</Badge>
              </div>

              {lastSaleId && (
                <div className="mt-2 space-y-2 rounded-btn border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
                  <p>
                    Venda confirmada. Pedido{" "}
                    <span className="font-mono font-bold">
                      {lastSaleId.slice(0, 8).toUpperCase()}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-[36px]"
                      onClick={() => setFiscalModalOpen(true)}
                    >
                      Emitir NFC-e
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-[36px]"
                      onClick={() => printReceipt()}
                    >
                      Imprimir recibo
                    </Button>
                  </div>
                  <p className="text-[11px] text-green-800">
                    A venda já está registrada no ERP. Emitir NFC-e agora é opcional.
                  </p>
                </div>
              )}

              <ul
                className={cn(
                  "mt-2 space-y-1",
                  "max-h-[min(52vh,320px)] overflow-y-auto overscroll-contain lg:max-h-none lg:overflow-visible",
                )}
              >
                {lines.length === 0 ? (
                  <li className="rounded-btn border border-dashed border-marinha-900/15 py-6 text-center text-xs text-marinha-500">
                    Bipe o codigo ou toque nos produtos
                  </li>
                ) : (
                  lines.map(({ product, qty }) => (
                    <li
                      key={product.id}
                      className="flex items-center gap-1.5 rounded border border-marinha-900/10 bg-white/90 px-1.5 py-1"
                    >
                      <div className="min-w-0 flex-1 leading-tight">
                        <p className="font-mono text-[10px] text-marinha-500">
                          {product.sku}
                        </p>
                        <p className="truncate text-xs font-medium text-marinha-900">
                          {product.name}
                        </p>
                        <p className="text-[11px] tabular-nums text-marinha-600">
                          {fmt.format(product.price)}{" "}
                          <span className="text-marinha-400">x</span> {qty}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          className="focus-ring flex h-8 w-8 items-center justify-center rounded border border-marinha-900/15 text-sm font-bold touch-manipulation"
                          onClick={() => setQty(product.id, qty - 1)}
                          aria-label="Diminuir quantidade"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-xs font-bold tabular-nums">
                          {qty}
                        </span>
                        <button
                          type="button"
                          className="focus-ring flex h-8 w-8 items-center justify-center rounded border border-marinha-900/15 text-sm font-bold touch-manipulation"
                          onClick={() => setQty(product.id, qty + 1)}
                          aria-label="Aumentar quantidade"
                        >
                          +
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>

              <div className="mt-2 space-y-1 border-t border-marinha-900/10 pt-2">
                <div className="flex justify-between text-xs text-marinha-600">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{fmt.format(subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-marinha-600">
                  <span>Pagamento</span>
                  <span>
                    {
                      PAYMENT_OPTIONS.find((option) => option.value === paymentMethod)
                        ?.label
                    }
                  </span>
                </div>
                <div className="flex justify-between font-serif text-lg font-bold text-marinha-900">
                  <span>Total</span>
                  <span className="tabular-nums text-municipal-800">
                    {fmt.format(subtotal)}
                  </span>
                </div>
              </div>

              {saleError && <p className="mt-2 text-xs text-red-600">{saleError}</p>}

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="secondary"
                  className="min-h-[44px] flex-1 touch-manipulation"
                  type="button"
                  disabled={lines.length === 0 || isSaving}
                  onClick={() => {
                    setLines([]);
                    setLastSaleId(null);
                  }}
                >
                  Limpar
                </Button>
                <Button
                  variant="primary"
                  className="min-h-[44px] flex-1 touch-manipulation"
                  type="button"
                  disabled={lines.length === 0 || isSaving}
                  onClick={() => void finalizeSale()}
                >
                  {isSaving ? "Confirmando..." : "Finalizar venda"}
                </Button>
              </div>

              <p className="mt-2 text-[11px] text-marinha-500">
                Ao finalizar, a venda é confirmada no ERP. Depois você pode emitir NFC-e ou usar apenas recibo não fiscal.
              </p>
            </Card>
          </aside>
        </div>
      </div>

      <ErpFiscalEmitModal
        open={fiscalModalOpen}
        onClose={() => setFiscalModalOpen(false)}
        preSelectedOrderId={lastSaleId}
        preSelectedType="nfce"
        preSelectedPaymentMethod={paymentMethod}
      />
    </>
  );
}
