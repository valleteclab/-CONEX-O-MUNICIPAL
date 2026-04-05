"use client";

import { useCallback, useEffect, useState } from "react";
import { ErpDataTable, type ErpColumn } from "@/components/erp/erp-data-table";
import { ErpFormModal } from "@/components/erp/erp-form-modal";
import { PageIntro } from "@/components/layout/page-intro";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { erpFetch } from "@/lib/api-browser";
import { getBusinessId } from "@/lib/auth-storage";

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

const TAKE = 50;

const MOVE_LABELS: Record<string, string> = { in: "Entrada", out: "Saída", adjust: "Ajuste" };
const MOVE_COLORS: Record<string, string> = {
  in: "bg-green-100 text-green-700",
  out: "bg-red-100 text-red-700",
  adjust: "bg-yellow-100 text-yellow-700",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const balanceColumns: ErpColumn<StockBalance>[] = [
  {
    key: "product",
    label: "Produto",
    render: (r) =>
      r.product ? (
        <span>
          {r.product.name}{" "}
          <span className="font-mono text-xs text-marinha-500">({r.product.sku})</span>
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
  {
    key: "product",
    label: "Produto",
    render: (r) => r.product?.name ?? r.productId,
  },
  { key: "quantity", label: "Qtd", render: (r) => r.quantity },
  { key: "refType", label: "Referência", render: (r) => r.refType ?? "—" },
  { key: "note", label: "Obs.", render: (r) => r.note ?? "—" },
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

  const noBusinessId = !getBusinessId();

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
      const res = await erpFetch<StockMovement[]>(
        `/api/v1/erp/stock/movements?take=${TAKE}&skip=${currentSkip}`,
      );
      if (res.ok && res.data) {
        setMovements((prev) => (reset ? res.data! : [...prev, ...res.data!]));
        setMovSkip(currentSkip + res.data.length);
        setMovHasMore(res.data.length === TAKE);
      } else {
        setMovementsError(res.error ?? "Erro ao carregar movimentações.");
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
    const res = await erpFetch<Product[]>("/api/v1/erp/products?take=100&skip=0");
    if (res.ok && res.data) setProducts(res.data);
  }, []);

  useEffect(() => {
    if (noBusinessId) return;
    loadBalances();
    loadMovements(true);
    loadLocations();
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noBusinessId]);

  const handleMoveSubmit = async () => {
    if (!moveForm.productId || !moveForm.locationId || !moveForm.quantity) {
      setMoveError("Produto, local e quantidade são obrigatórios.");
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
      loadBalances();
      loadMovements(true);
    } else {
      setMoveError(res.error ?? "Erro ao registrar movimentação.");
    }
    setIsMoveSubmitting(false);
  };

  const handleLocationSubmit = async () => {
    if (!locationForm.name.trim()) {
      setLocationError("Nome é obrigatório.");
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
      <option value="">— Selecione —</option>
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
        description="Locais de armazenamento, saldos por produto e histórico de movimentações."
        badge="Operação"
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <Button
          variant="primary"
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
      </div>

      <Card className="mb-6">
        <h2 className="mb-4 font-serif text-lg font-bold text-marinha-900">Saldos</h2>
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
        <h2 className="mb-4 font-serif text-lg font-bold text-marinha-900">Movimentações</h2>
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

      {/* Modal: Nova movimentação */}
      <ErpFormModal
        title="Nova movimentação"
        open={moveModal}
        onClose={() => setMoveModal(false)}
        onSubmit={handleMoveSubmit}
        isSubmitting={isMoveSubmitting}
      >
        <div className="grid grid-cols-2 gap-4">
          {field(
            "Tipo *",
            sel(
              moveForm.type,
              (v) => setMoveForm((f) => ({ ...f, type: v as "in" | "out" | "adjust" })),
              [
                { value: "in", label: "Entrada" },
                { value: "out", label: "Saída" },
                { value: "adjust", label: "Ajuste (saldo absoluto)" },
              ],
            ),
          )}
          {field(
            "Produto *",
            sel(
              moveForm.productId,
              (v) => setMoveForm((f) => ({ ...f, productId: v })),
              products.map((p) => ({ value: p.id, label: `${p.sku} — ${p.name}` })),
            ),
          )}
          {field(
            "Local *",
            sel(
              moveForm.locationId,
              (v) => setMoveForm((f) => ({ ...f, locationId: v })),
              locations.map((l) => ({ value: l.id, label: l.name + (l.isDefault ? " (padrão)" : "") })),
            ),
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
              "Observação",
              <input
                type="text"
                value={moveForm.note}
                onChange={(e) => setMoveForm((f) => ({ ...f, note: e.target.value }))}
                className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
              />,
            )}
          </div>
        </div>
        {moveError && <p className="mt-3 text-sm text-red-600">{moveError}</p>}
      </ErpFormModal>

      {/* Modal: Novo local */}
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
            Definir como local padrão
          </label>
        </div>
        {locationError && <p className="mt-3 text-sm text-red-600">{locationError}</p>}
      </ErpFormModal>
    </>
  );
}
