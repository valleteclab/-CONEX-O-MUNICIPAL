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

type FinanceStatus = "open" | "paid" | "cancelled";
type FinanceOrigin = "manual" | "sales_order" | "purchase_order";

type FinanceDoc = {
  id: string;
  partyId: string;
  dueDate: string;
  amount: string;
  status: FinanceStatus;
  linkRef?: string | null;
  linkId?: string | null;
  note: string | null;
  party?: { name: string };
};

type CashEntry = {
  id: string;
  type: "in" | "out";
  amount: string;
  category: string;
  occurredAt: string;
  description: string | null;
};

type Party = {
  id: string;
  name: string;
  type?: string;
};

type FinanceSummary = {
  period: {
    from: string | null;
    to: string | null;
  };
  cash: {
    entries: number;
    totalIn: string;
    totalOut: string;
    balance: string;
  };
  receivables: {
    openCount: number;
    openAmount: string;
  };
  payables: {
    openCount: number;
    openAmount: string;
  };
};

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

const FIN_STATUS_LABEL: Record<FinanceStatus, string> = {
  open: "Em aberto",
  paid: "Pago",
  cancelled: "Cancelado",
};

const FIN_STATUS_COLOR: Record<FinanceStatus, string> = {
  open: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  cancelled: "bg-marinha-100 text-marinha-500",
};

const FIN_LINK_LABEL: Record<Exclude<FinanceOrigin, "manual">, string> = {
  sales_order: "Pedido de venda",
  purchase_order: "Pedido de compra",
};

function buildFinanceHref(linkRef: string, linkId: string) {
  if (linkRef === "sales_order") {
    return `/erp/pedidos-venda?focus=${linkId}`;
  }
  if (linkRef === "purchase_order") {
    return `/erp/pedidos-compra?focus=${linkId}`;
  }
  return null;
}

function buildFinanceQuery(params: {
  status?: FinanceStatus | "";
  origin?: FinanceOrigin | "";
}) {
  const search = new URLSearchParams({
    take: String(TAKE),
    skip: "0",
  });
  if (params.status) {
    search.set("status", params.status);
  }
  if (params.origin) {
    search.set("origin", params.origin);
  }
  return search.toString();
}

function makeFinColumns(
  partyLabel: string,
  actionLabel: string,
  onStatus: (id: string, status: "paid" | "cancelled") => void,
): ErpColumn<FinanceDoc>[] {
  return [
    { key: "party", label: partyLabel, render: (r) => r.party?.name ?? "—" },
    {
      key: "origin",
      label: "Origem",
      render: (r) => {
        if (!r.linkRef || !r.linkId) {
          return <span className="text-xs text-marinha-400">Manual</span>;
        }
        const href = buildFinanceHref(r.linkRef, r.linkId);
        const label = FIN_LINK_LABEL[r.linkRef as Exclude<FinanceOrigin, "manual">] ?? r.linkRef;
        return (
          <div className="text-xs text-marinha-600">
            <p className="font-medium text-marinha-800">{label}</p>
            {href ? (
              <Link href={href} className="font-mono text-municipal-700 underline">
                {shortId(r.linkId)}
              </Link>
            ) : (
              <p className="font-mono">{shortId(r.linkId)}</p>
            )}
          </div>
        );
      },
    },
    { key: "dueDate", label: "Vencimento", render: (r) => fmtDate(r.dueDate) },
    { key: "amount", label: "Valor", render: (r) => fmt(r.amount) },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${FIN_STATUS_COLOR[r.status]}`}
        >
          {FIN_STATUS_LABEL[r.status]}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r) =>
        r.status === "open" ? (
          <div className="flex gap-2">
            <button
              onClick={() => onStatus(r.id, "paid")}
              className="rounded-btn bg-green-600 px-2 py-1 text-xs font-semibold text-white hover:bg-green-700"
            >
              {actionLabel}
            </button>
            <button
              onClick={() => onStatus(r.id, "cancelled")}
              className="rounded-btn border border-red-300 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
            >
              Cancelar
            </button>
          </div>
        ) : null,
    },
  ];
}

const cashColumns: ErpColumn<CashEntry>[] = [
  { key: "occurredAt", label: "Data", render: (r) => fmtDate(r.occurredAt) },
  {
    key: "type",
    label: "Tipo",
    render: (r) => (
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.type === "in" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
      >
        {r.type === "in" ? "Entrada" : "Saída"}
      </span>
    ),
  },
  { key: "category", label: "Categoria", render: (r) => r.category },
  { key: "amount", label: "Valor", render: (r) => fmt(r.amount) },
  { key: "description", label: "Descrição", render: (r) => r.description ?? "—" },
];

type Modal = "ar" | "ap" | "cash" | null;

export default function ErpFinanceiroPage() {
  const [ar, setAr] = useState<FinanceDoc[]>([]);
  const [ap, setAp] = useState<FinanceDoc[]>([]);
  const [cash, setCash] = useState<CashEntry[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [customerParties, setCustomerParties] = useState<Party[]>([]);
  const [supplierParties, setSupplierParties] = useState<Party[]>([]);

  const [arLoading, setArLoading] = useState(false);
  const [apLoading, setApLoading] = useState(false);
  const [cashLoading, setCashLoading] = useState(false);
  const [arError, setArError] = useState<string | null>(null);
  const [apError, setApError] = useState<string | null>(null);
  const [cashError, setCashError] = useState<string | null>(null);

  const [arStatusFilter, setArStatusFilter] = useState<FinanceStatus | "">("");
  const [apStatusFilter, setApStatusFilter] = useState<FinanceStatus | "">("");
  const [arOriginFilter, setArOriginFilter] = useState<FinanceOrigin | "">("");
  const [apOriginFilter, setApOriginFilter] = useState<FinanceOrigin | "">("");

  const [openModal, setOpenModal] = useState<Modal>(null);
  const [finForm, setFinForm] = useState({ partyId: "", dueDate: "", amount: "", note: "" });
  const [cashForm, setCashForm] = useState({
    type: "in" as "in" | "out",
    amount: "",
    category: "",
    occurredAt: new Date().toISOString().slice(0, 16),
    description: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const businessId = useSelectedBusinessId();
  const noBusinessId = !businessId;

  const loadAr = useCallback(async () => {
    setArLoading(true);
    setArError(null);
    const query = buildFinanceQuery({
      status: arStatusFilter,
      origin: arOriginFilter,
    });
    const res = await erpFetch<ErpListResponse<FinanceDoc>>(`/api/v1/erp/finance/ar?${query}`);
    if (res.ok && res.data) setAr(res.data.items);
    else setArError(res.error ?? "Erro ao carregar contas a receber.");
    setArLoading(false);
  }, [arOriginFilter, arStatusFilter]);

  const loadAp = useCallback(async () => {
    setApLoading(true);
    setApError(null);
    const query = buildFinanceQuery({
      status: apStatusFilter,
      origin: apOriginFilter,
    });
    const res = await erpFetch<ErpListResponse<FinanceDoc>>(`/api/v1/erp/finance/ap?${query}`);
    if (res.ok && res.data) setAp(res.data.items);
    else setApError(res.error ?? "Erro ao carregar contas a pagar.");
    setApLoading(false);
  }, [apOriginFilter, apStatusFilter]);

  const loadCash = useCallback(async () => {
    setCashLoading(true);
    setCashError(null);
    const res = await erpFetch<ErpListResponse<CashEntry>>(
      `/api/v1/erp/finance/cash?take=${TAKE}&skip=0`,
    );
    if (res.ok && res.data) setCash(res.data.items);
    else setCashError(res.error ?? "Erro ao carregar fluxo de caixa.");
    setCashLoading(false);
  }, []);

  const loadSummary = useCallback(async () => {
    const res = await erpFetch<FinanceSummary>("/api/v1/erp/finance/summary");
    if (res.ok && res.data) setSummary(res.data);
  }, []);

  const loadParties = useCallback(async () => {
    const res = await erpFetch<ErpListResponse<Party>>("/api/v1/erp/parties?take=100&skip=0");
    if (!res.ok || !res.data) return;
    setCustomerParties(
      res.data.items.filter((party) => party.type === "customer" || party.type === "both"),
    );
    setSupplierParties(
      res.data.items.filter((party) => party.type === "supplier" || party.type === "both"),
    );
  }, []);

  useEffect(() => {
    if (noBusinessId) {
      setAr([]);
      setAp([]);
      setCash([]);
      setSummary(null);
      setCustomerParties([]);
      setSupplierParties([]);
      return;
    }
    void loadSummary();
    void loadParties();
  }, [businessId, loadParties, loadSummary, noBusinessId]);

  useEffect(() => {
    if (noBusinessId) return;
    void loadAr();
  }, [loadAr, noBusinessId]);

  useEffect(() => {
    if (noBusinessId) return;
    void loadAp();
  }, [loadAp, noBusinessId]);

  useEffect(() => {
    if (noBusinessId) return;
    void loadCash();
  }, [loadCash, noBusinessId]);

  const patchArStatus = async (id: string, status: "paid" | "cancelled") => {
    setStatusError(null);
    const res = await erpFetch(`/api/v1/erp/finance/ar/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setStatusError(res.error ?? "Erro ao atualizar conta a receber.");
      return;
    }
    void Promise.all([loadAr(), loadSummary()]);
  };

  const patchApStatus = async (id: string, status: "paid" | "cancelled") => {
    setStatusError(null);
    const res = await erpFetch(`/api/v1/erp/finance/ap/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setStatusError(res.error ?? "Erro ao atualizar conta a pagar.");
      return;
    }
    void Promise.all([loadAp(), loadSummary()]);
  };

  const handleFinSubmit = async (endpoint: "ar" | "ap") => {
    if (!finForm.partyId || !finForm.dueDate || !finForm.amount) {
      setFormError("Parte, vencimento e valor são obrigatórios.");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    const res = await erpFetch<FinanceDoc>(`/api/v1/erp/finance/${endpoint}`, {
      method: "POST",
      body: JSON.stringify({
        partyId: finForm.partyId,
        dueDate: finForm.dueDate,
        amount: finForm.amount,
        ...(finForm.note ? { note: finForm.note } : {}),
      }),
    });
    if (res.ok && res.data) {
      setOpenModal(null);
      await Promise.all([endpoint === "ar" ? loadAr() : loadAp(), loadSummary()]);
    } else {
      setFormError(res.error ?? "Erro ao criar lançamento.");
    }
    setIsSubmitting(false);
  };

  const handleCashSubmit = async () => {
    if (!cashForm.amount || !cashForm.category || !cashForm.occurredAt) {
      setFormError("Valor, categoria e data são obrigatórios.");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    const res = await erpFetch<CashEntry>("/api/v1/erp/finance/cash", {
      method: "POST",
      body: JSON.stringify({
        type: cashForm.type,
        amount: cashForm.amount,
        category: cashForm.category,
        occurredAt: new Date(cashForm.occurredAt).toISOString(),
        ...(cashForm.description ? { description: cashForm.description } : {}),
      }),
    });
    if (res.ok && res.data) {
      setOpenModal(null);
      await Promise.all([loadCash(), loadSummary()]);
    } else {
      setFormError(res.error ?? "Erro ao criar lançamento.");
    }
    setIsSubmitting(false);
  };

  const openFin = (type: "ar" | "ap") => {
    setFinForm({ partyId: "", dueDate: "", amount: "", note: "" });
    setFormError(null);
    setStatusError(null);
    setOpenModal(type);
  };

  const openCash = () => {
    setCashForm({
      type: "in",
      amount: "",
      category: "",
      occurredAt: new Date().toISOString().slice(0, 16),
      description: "",
    });
    setFormError(null);
    setStatusError(null);
    setOpenModal("cash");
  };

  const field = (label: string, el: React.ReactNode) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-marinha-700">{label}</label>
      {el}
    </div>
  );

  const filterSelect = (
    value: string,
    onChange: (value: string) => void,
    options: Array<{ value: string; label: string }>,
  ) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  const arColumns = makeFinColumns("Cliente", "Receber", patchArStatus);
  const apColumns = makeFinColumns("Fornecedor", "Pagar", patchApStatus);
  const modalParties = openModal === "ar" ? customerParties : supplierParties;

  return (
    <>
      <PageIntro
        title="Financeiro"
        description="Acompanhe recebimentos, pagamentos e o movimento do caixa da empresa em um so lugar."
        badge="Financeiro"
      />

      {statusError && (
        <div className="mb-4 rounded-btn border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {statusError}
        </div>
      )}

      {summary && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-btn border border-green-200 bg-green-50 p-4">
            <p className="text-xs text-green-700">Total a receber</p>
            <p className="mt-1 text-lg font-bold text-green-800">
              {fmt(summary.receivables.openAmount)}
            </p>
            <p className="mt-1 text-xs text-green-700">
              {summary.receivables.openCount} titulo(s) em aberto
            </p>
          </div>
          <div className="rounded-btn border border-red-200 bg-red-50 p-4">
            <p className="text-xs text-red-700">Total a pagar</p>
            <p className="mt-1 text-lg font-bold text-red-800">
              {fmt(summary.payables.openAmount)}
            </p>
            <p className="mt-1 text-xs text-red-700">
              {summary.payables.openCount} titulo(s) em aberto
            </p>
          </div>
          <div className="rounded-btn border border-marinha-900/10 bg-surface-card p-4">
            <p className="text-xs text-marinha-600">Saldo do caixa</p>
            <p className="mt-1 text-lg font-bold text-marinha-900">{fmt(summary.cash.balance)}</p>
            <p className="mt-1 text-xs text-marinha-500">
              {summary.cash.entries} lancamento(s) no periodo
            </p>
          </div>
          <div className="rounded-btn border border-marinha-900/10 bg-surface-card p-4">
            <p className="text-xs text-marinha-600">Rotina financeira</p>
            <p className="mt-1 text-lg font-bold text-marinha-900">
              {fmt(summary.cash.totalIn)} / {fmt(summary.cash.totalOut)}
            </p>
            <p className="mt-1 text-xs text-marinha-500">Entradas / saidas do periodo</p>
          </div>
        </div>
      )}

      <Card className="mb-6 border border-marinha-900/8 bg-surface-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-lg text-marinha-900">Centro financeiro</h2>
            <p className="mt-1 text-sm text-marinha-500">
              Lance recebimentos, despesas e movimentacoes conforme a rotina diaria da empresa.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Badge tone="accent">Lancamentos</Badge>
            <Button variant="primary" onClick={() => openFin("ar")} disabled={noBusinessId}>
              Novo recebimento
            </Button>
            <Button variant="secondary" onClick={() => openFin("ap")} disabled={noBusinessId}>
              Nova conta a pagar
            </Button>
            <Button variant="secondary" onClick={openCash} disabled={noBusinessId}>
              Lancar no caixa
            </Button>
          </div>
        </div>
      </Card>

      <Card className="mb-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg font-bold text-marinha-900">Contas a receber</h2>
            <p className="mt-1 text-sm text-marinha-500">Valores previstos de entrada na empresa.</p>
          </div>
          <Badge tone="success">Recebimentos</Badge>
        </div>
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          {field(
            "Filtrar por status",
            filterSelect(arStatusFilter, (value) => setArStatusFilter(value as FinanceStatus | ""), [
              { value: "", label: "Todos os status" },
              { value: "open", label: "Em aberto" },
              { value: "paid", label: "Pago" },
              { value: "cancelled", label: "Cancelado" },
            ]),
          )}
          {field(
            "Filtrar por origem",
            filterSelect(arOriginFilter, (value) => setArOriginFilter(value as FinanceOrigin | ""), [
              { value: "", label: "Todas as origens" },
              { value: "manual", label: "Manual" },
              { value: "sales_order", label: "Pedido de venda" },
            ]),
          )}
        </div>
        <ErpDataTable
          columns={arColumns}
          data={ar}
          isLoading={arLoading}
          error={arError}
          emptyMessage="Nenhuma conta a receber."
          onRetry={loadAr}
          keyExtractor={(r) => r.id}
        />
      </Card>

      <Card className="mb-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg font-bold text-marinha-900">Contas a pagar</h2>
            <p className="mt-1 text-sm text-marinha-500">Compromissos financeiros e despesas pendentes.</p>
          </div>
          <Badge tone="warning">Pagamentos</Badge>
        </div>
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          {field(
            "Filtrar por status",
            filterSelect(apStatusFilter, (value) => setApStatusFilter(value as FinanceStatus | ""), [
              { value: "", label: "Todos os status" },
              { value: "open", label: "Em aberto" },
              { value: "paid", label: "Pago" },
              { value: "cancelled", label: "Cancelado" },
            ]),
          )}
          {field(
            "Filtrar por origem",
            filterSelect(apOriginFilter, (value) => setApOriginFilter(value as FinanceOrigin | ""), [
              { value: "", label: "Todas as origens" },
              { value: "manual", label: "Manual" },
              { value: "purchase_order", label: "Pedido de compra" },
            ]),
          )}
        </div>
        <ErpDataTable
          columns={apColumns}
          data={ap}
          isLoading={apLoading}
          error={apError}
          emptyMessage="Nenhuma conta a pagar."
          onRetry={loadAp}
          keyExtractor={(r) => r.id}
        />
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg font-bold text-marinha-900">Fluxo de caixa</h2>
            <p className="mt-1 text-sm text-marinha-500">Entradas e saídas registradas no dia a dia da operação.</p>
          </div>
          <Badge tone="neutral">Caixa</Badge>
        </div>
        <ErpDataTable
          columns={cashColumns}
          data={cash}
          isLoading={cashLoading}
          error={cashError}
          emptyMessage="Nenhum lancamento de caixa."
          onRetry={loadCash}
          keyExtractor={(r) => r.id}
        />
      </Card>

      <ErpFormModal
        title={openModal === "ar" ? "Novo recebimento" : "Nova conta a pagar"}
        open={openModal === "ar" || openModal === "ap"}
        onClose={() => setOpenModal(null)}
        onSubmit={() => handleFinSubmit(openModal as "ar" | "ap")}
        isSubmitting={isSubmitting}
      >
        <div className="grid grid-cols-2 gap-4">
          {field(
            openModal === "ar" ? "Cliente *" : "Fornecedor *",
            <select
              value={finForm.partyId}
              onChange={(e) => setFinForm((f) => ({ ...f, partyId: e.target.value }))}
              className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
            >
              <option value="">— Selecione —</option>
              {modalParties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>,
          )}
          {field(
            "Vencimento *",
            <input
              type="date"
              value={finForm.dueDate}
              onChange={(e) => setFinForm((f) => ({ ...f, dueDate: e.target.value }))}
              className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
            />,
          )}
          {field(
            "Valor (R$) *",
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={finForm.amount}
              onChange={(e) => setFinForm((f) => ({ ...f, amount: e.target.value }))}
              className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
            />,
          )}
          {field(
            "Observacao",
            <input
              type="text"
              value={finForm.note}
              onChange={(e) => setFinForm((f) => ({ ...f, note: e.target.value }))}
              className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
            />,
          )}
        </div>
        {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
      </ErpFormModal>

      <ErpFormModal
        title="Lancamento de caixa"
        open={openModal === "cash"}
        onClose={() => setOpenModal(null)}
        onSubmit={handleCashSubmit}
        isSubmitting={isSubmitting}
      >
        <div className="grid grid-cols-2 gap-4">
          {field(
            "Tipo *",
            <select
              value={cashForm.type}
              onChange={(e) =>
                setCashForm((f) => ({ ...f, type: e.target.value as "in" | "out" }))
              }
              className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
            >
              <option value="in">Entrada</option>
              <option value="out">Saída</option>
            </select>,
          )}
          {field(
            "Valor (R$) *",
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={cashForm.amount}
              onChange={(e) => setCashForm((f) => ({ ...f, amount: e.target.value }))}
              className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
            />,
          )}
          {field(
            "Categoria *",
            <input
              type="text"
              placeholder="Ex: Vendas, Aluguel, Materiais"
              value={cashForm.category}
              onChange={(e) => setCashForm((f) => ({ ...f, category: e.target.value }))}
              className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
            />,
          )}
          {field(
            "Data/hora *",
            <input
              type="datetime-local"
              value={cashForm.occurredAt}
              onChange={(e) => setCashForm((f) => ({ ...f, occurredAt: e.target.value }))}
              className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
            />,
          )}
          <div className="col-span-2">
            {field(
              "Descricao",
              <input
                type="text"
                value={cashForm.description}
                onChange={(e) => setCashForm((f) => ({ ...f, description: e.target.value }))}
                className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
              />,
            )}
          </div>
        </div>
        {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
      </ErpFormModal>
    </>
  );
}
