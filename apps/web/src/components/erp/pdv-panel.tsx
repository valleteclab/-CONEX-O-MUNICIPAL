"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

type Product = { id: string; name: string; price: number };

const MOCK: Product[] = [
  { id: "1", name: "Pão francês (un.)", price: 1.2 },
  { id: "2", name: "Café médio", price: 6.0 },
  { id: "3", name: "Água 500ml", price: 3.5 },
  { id: "4", name: "Refrigerante lata", price: 5.0 },
  { id: "5", name: "Sanduíche", price: 14.9 },
  { id: "6", name: "Suco natural", price: 9.0 },
];

const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type Line = { product: Product; qty: number };

export function PdvPanel() {
  const [q, setQ] = useState("");
  const [lines, setLines] = useState<Line[]>([]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) {
      return MOCK;
    }
    return MOCK.filter((p) => p.name.toLowerCase().includes(s));
  }, [q]);

  function addLine(p: Product) {
    setLines((prev) => {
      const i = prev.findIndex((l) => l.product.id === p.id);
      if (i === -1) {
        return [...prev, { product: p, qty: 1 }];
      }
      const next = [...prev];
      next[i] = { ...next[i], qty: next[i].qty + 1 };
      return next;
    });
  }

  function setQty(productId: string, qty: number) {
    if (qty < 1) {
      setLines((prev) => prev.filter((l) => l.product.id !== productId));
      return;
    }
    setLines((prev) =>
      prev.map((l) => (l.product.id === productId ? { ...l, qty } : l)),
    );
  }

  const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6",
        "min-h-[min(70vh,720px)]",
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
            placeholder="Buscar produto…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full sm:max-w-md"
            autoComplete="off"
          />
        </div>
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
              <span className="text-sm font-semibold leading-tight text-marinha-900">{p.name}</span>
              <span className="mt-1 text-sm font-bold text-municipal-800">{fmt.format(p.price)}</span>
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <p className="text-sm text-marinha-500">Nenhum produto encontrado.</p>
        ) : null}
      </section>

      {/* Cupom / carrinho */}
      <aside
        className={cn(
          "w-full shrink-0 lg:sticky lg:top-24 lg:w-[min(100%,24rem)] xl:w-[28rem]",
        )}
        aria-label="Cupom fiscal"
      >
        <Card variant="featured" className="flex flex-col p-4 sm:p-5">
          <h2 className="font-serif text-lg font-bold text-marinha-900">Cupom</h2>
          <ul className="mt-3 max-h-[40vh] min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain lg:max-h-[min(50vh,420px)]">
            {lines.length === 0 ? (
              <li className="rounded-btn border border-dashed border-marinha-900/15 py-8 text-center text-sm text-marinha-500">
                Toque nos produtos para adicionar
              </li>
            ) : (
              lines.map(({ product, qty }) => (
                <li
                  key={product.id}
                  className="flex items-center gap-2 rounded-btn border border-marinha-900/8 bg-white/80 px-2 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-marinha-900">{product.name}</p>
                    <p className="text-xs text-marinha-500">{fmt.format(product.price)} c/u</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-btn border border-marinha-900/15 text-lg font-bold touch-manipulation"
                      onClick={() => setQty(product.id, qty - 1)}
                      aria-label="Diminuir quantidade"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-bold tabular-nums">{qty}</span>
                    <button
                      type="button"
                      className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-btn border border-marinha-900/15 text-lg font-bold touch-manipulation"
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
          <div className="mt-4 space-y-2 border-t border-marinha-900/10 pt-4">
            <div className="flex justify-between text-sm text-marinha-600">
              <span>Subtotal</span>
              <span className="tabular-nums">{fmt.format(subtotal)}</span>
            </div>
            <div className="flex justify-between font-serif text-xl font-bold text-marinha-900">
              <span>Total</span>
              <span className="tabular-nums text-municipal-800">{fmt.format(subtotal)}</span>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              variant="secondary"
              className="min-h-[48px] flex-1 touch-manipulation"
              type="button"
              disabled={lines.length === 0}
              onClick={() => setLines([])}
            >
              Limpar
            </Button>
            <Button variant="primary" className="min-h-[48px] flex-1 touch-manipulation" type="button" disabled>
              Finalizar venda
            </Button>
          </div>
          <p className="mt-3 text-xs text-marinha-500">
            Pagamento (PIX, dinheiro, cartão) e vínculo com estoque/NFC-e na integração da API.
          </p>
        </Card>
      </aside>
    </div>
  );
}
