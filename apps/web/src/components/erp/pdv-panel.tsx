"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { erpFetch } from "@/lib/api-browser";
import { cn } from "@/lib/cn";

type ApiProduct = {
  id: string;
  name: string;
  sku: string;
  price: string;
  barcode: string | null;
  isActive: boolean;
};

type Product = { id: string; name: string; price: number; barcode: string; sku: string };

type Line = { product: Product; qty: number };

type SaleResult = { id: string };

const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function mapProduct(p: ApiProduct): Product {
  return {
    id: p.id,
    name: p.name,
    price: Number(p.price),
    barcode: p.barcode ?? "",
    sku: p.sku,
  };
}

export function PdvPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [lines, setLines] = useState<Line[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [saleError, setSaleError] = useState<string | null>(null);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoadingProducts(true);
      setLoadError(null);
      const res = await erpFetch<ApiProduct[]>("/api/v1/erp/products?take=100&skip=0");
      if (res.ok && res.data) {
        setProducts(res.data.filter((p) => p.isActive).map(mapProduct));
      } else {
        setLoadError(res.error ?? "Erro ao carregar produtos.");
      }
      setIsLoadingProducts(false);
    }
    load();
  }, []);

  const byBarcode = useMemo(
    () => Object.fromEntries(products.filter((p) => p.barcode).map((p) => [p.barcode, p])),
    [products],
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        p.sku.toLowerCase().includes(s) ||
        (p.barcode && p.barcode.includes(s.replace(/\D/g, ""))),
    );
  }, [products, q]);

  const addLine = useCallback((p: Product) => {
    setLines((prev) => {
      const i = prev.findIndex((l) => l.product.id === p.id);
      if (i === -1) return [...prev, { product: p, qty: 1 }];
      const next = [...prev];
      next[i] = { ...next[i], qty: next[i].qty + 1 };
      return next;
    });
    setLastSaleId(null);
  }, []);

  function tryAddByBarcode(raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 4) return false;
    const p = byBarcode[digits];
    if (p) {
      addLine(p);
      setBarcodeInput("");
      return true;
    }
    return false;
  }

  function onBarcodeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      tryAddByBarcode(barcodeInput);
    }
  }

  function setQty(productId: string, qty: number) {
    if (qty < 1) {
      setLines((prev) => prev.filter((l) => l.product.id !== productId));
      return;
    }
    setLines((prev) => prev.map((l) => (l.product.id === productId ? { ...l, qty } : l)));
  }

  const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);

  const finalizeSale = async () => {
    if (lines.length === 0) return;
    setIsSaving(true);
    setSaleError(null);
    const res = await erpFetch<SaleResult>("/api/v1/erp/sales-orders", {
      method: "POST",
      body: JSON.stringify({
        items: lines.map((l) => ({
          productId: l.product.id,
          qty: String(l.qty),
          unitPrice: String(l.product.price),
        })),
      }),
    });
    if (res.ok && res.data) {
      setLastSaleId(res.data.id);
      setLines([]);
    } else {
      setSaleError(res.error ?? "Erro ao registrar venda.");
    }
    setIsSaving(false);
  };

  return (
    <div className="flex flex-col gap-3 lg:gap-6">
      {/* Leitor / digitação */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor="pdv-barcode" className="mb-1 block text-xs font-semibold text-marinha-600">
            Código de barras
          </label>
          <Input
            id="pdv-barcode"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Bipe ou digite + Enter"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyDown={onBarcodeKeyDown}
            className="min-h-[44px] font-mono text-base tracking-wide"
          />
        </div>
      </div>

      <div
        className={cn(
          "flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6",
          "min-h-0 lg:min-h-[min(70vh,720px)]",
        )}
      >
        {/* Catálogo rápido */}
        <section className="min-w-0 flex-1 space-y-3" aria-label="Catálogo de produtos">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label htmlFor="pdv-search" className="sr-only">
              Buscar produto
            </label>
            <Input
              id="pdv-search"
              type="search"
              placeholder="Buscar nome, SKU ou EAN…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full sm:max-w-md"
              autoComplete="off"
            />
          </div>

          {isLoadingProducts ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-[72px] animate-pulse rounded-btn bg-marinha-900/8" />
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
              {filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addLine(p)}
                  className={cn(
                    "focus-ring flex min-h-[52px] flex-col items-start justify-center rounded-btn border border-marinha-900/10",
                    "bg-surface-card p-3 text-left shadow-card transition hover:border-municipal-600/35 hover:shadow-card-hover",
                    "active:scale-[0.99] touch-manipulation",
                  )}
                >
                  <span className="font-mono text-[10px] leading-none text-marinha-500">{p.sku}</span>
                  <span className="mt-1 text-sm font-semibold leading-tight text-marinha-900">{p.name}</span>
                  <span className="mt-1 text-sm font-bold text-municipal-800">{fmt.format(p.price)}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="col-span-full text-sm text-marinha-500">
                  {products.length === 0
                    ? "Nenhum produto ativo cadastrado. Adicione produtos no módulo Produtos."
                    : "Nenhum produto encontrado para esta busca."}
                </p>
              )}
            </div>
          )}
        </section>

        {/* Cupom */}
        <aside
          className={cn("w-full shrink-0 lg:sticky lg:top-24 lg:w-[min(100%,22rem)] xl:w-[26rem]")}
          aria-label="Cupom"
        >
          <Card variant="featured" className="flex flex-col p-3 sm:p-4">
            <h2 className="font-serif text-base font-bold text-marinha-900">Cupom</h2>

            {lastSaleId && (
              <div className="mt-2 rounded-btn border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
                Venda registrada! Pedido{" "}
                <span className="font-mono font-bold">{lastSaleId.slice(0, 8).toUpperCase()}</span>
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
                  Bipe o código ou toque nos produtos
                </li>
              ) : (
                lines.map(({ product, qty }) => (
                  <li
                    key={product.id}
                    className="flex items-center gap-1.5 rounded border border-marinha-900/10 bg-white/90 px-1.5 py-1"
                  >
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="font-mono text-[10px] text-marinha-500">{product.sku}</p>
                      <p className="truncate text-xs font-medium text-marinha-900">{product.name}</p>
                      <p className="text-[11px] tabular-nums text-marinha-600">
                        {fmt.format(product.price)} <span className="text-marinha-400">×</span>{" "}
                        {qty}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        className="focus-ring flex h-8 w-8 items-center justify-center rounded border border-marinha-900/15 text-sm font-bold touch-manipulation"
                        onClick={() => setQty(product.id, qty - 1)}
                        aria-label="Diminuir quantidade"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-xs font-bold tabular-nums">{qty}</span>
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
              <div className="flex justify-between font-serif text-lg font-bold text-marinha-900">
                <span>Total</span>
                <span className="tabular-nums text-municipal-800">{fmt.format(subtotal)}</span>
              </div>
            </div>

            {saleError && <p className="mt-2 text-xs text-red-600">{saleError}</p>}

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button
                variant="secondary"
                className="min-h-[44px] flex-1 touch-manipulation"
                type="button"
                disabled={lines.length === 0 || isSaving}
                onClick={() => { setLines([]); setLastSaleId(null); }}
              >
                Limpar
              </Button>
              <Button
                variant="primary"
                className="min-h-[44px] flex-1 touch-manipulation"
                type="button"
                disabled={lines.length === 0 || isSaving}
                onClick={finalizeSale}
              >
                {isSaving ? "Salvando…" : "Finalizar venda"}
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-marinha-500">
              NFC-e disponível na integração fiscal (Onda B).
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
