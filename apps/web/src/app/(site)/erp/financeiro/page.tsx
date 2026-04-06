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

type FinanceDoc = {
  id: string;
  partyId: string;
  dueDate: string;
  amount: string;
  status: "open" | "paid" | "cancelled";
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

type Party = { id: string; name: string };

type FinanceSummary = {
  arOpen?: string;
  apOpen?: string;
  [key: string]: unknown;
};

const TAKE = 50;

function fmt(v: string) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR");
}

const FIN_STATUS_LABEL: Record<string, string> = {
  open: "Em aberto",
  paid: "Pago",
  cancelled: "Cancelado",
};

const FIN_STATUS_COLOR: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  cancelled: "bg-marinha-100 text-marinha-500",
};

function makeFinColumns(
  partyLabel: string,
  onStatus: (id: string, status: "paid" | "cancelled") => void,
): ErpColumn<FinanceDoc>[] {
  return [
    { key: "party", label: partyLabel, render: (r) => r.party?.name ?? "—" },
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
              Recebido
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
  const [parties, setParties] = useState<Party[]>([]);

  const [arLoading, setArLoading] = useState(false);
  const [apLoading, setApLoading] = useState(false);
  const [cashLoading, setCashLoading] = useState(false);
  const [arError, setArError] = useState<string | null>(null);
  const [apError, setApError] = useState<string | null>(null);
  const [cashError, setCashError] = useState<string | null>(null);

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const businessId = useSelectedBusinessId();
  const noBusinessId = !businessId;

  const loadAr = useCallback(async () => {
    setArLoading(true);
    setArError(null);
    const res = await erpFetch<ErpListResponse<FinanceDoc>>(
      `/api/v1/erp/finance/ar?take=${TAKE}&skip=0`,
    );
    if (res.ok && res.data) setAr(res.data.items);
    else setArError(res.error ?? "Erro ao carregar contas a receber.");
    setArLoading(false);
  }, []);

  const loadAp = useCallback(async () => {
    setApLoading(true);
    setApError(null);
    const res = await erpFetch<ErpListResponse<FinanceDoc>>(
      `/api/v1/erp/finance/ap?take=${TAKE}&skip=0`,
    );
    if (res.ok && res.data) setAp(res.data.items);
    else setApError(res.error ?? "Erro ao carregar contas a pagar.");
    setApLoading(false);
  }, []);

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
    if (res.ok && res.data) setParties(res.data.items);
  }, []);

  useEffect(() => {
    if (noBusinessId) {
      setAr([]);
      setAp([]);
      setCash([]);
      setSummary(null);
      setParties([]);
      return;
    }
    loadAr();
    loadAp();
    loadCash();
    loadSummary();
    loadParties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const patchArStatus = async (id: string, status: "paid" | "cancelled") => {
    const res = await erpFetch(`/api/v1/erp/finance/ar/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (res.ok) setAr((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
  };

  const patchApStatus = async (id: string, status: "paid" | "cancelled") => {
    const res = await erpFetch(`/api/v1/erp/finance/ap/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (res.ok) setAp((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
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
      if (endpoint === "ar") setAr((prev) => [res.data!, ...prev]);
      else setAp((prev) => [res.data!, ...prev]);
      setOpenModal(null);
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
      setCash((prev) => [res.data!, ...prev]);
      setOpenModal(null);
    } else {
      setFormError(res.error ?? "Erro ao criar lançamento.");
    }
    setIsSubmitting(false);
  };

  const openFin = (type: "ar" | "ap") => {
    setFinForm({ partyId: "", dueDate: "", amount: "", note: "" });
    setFormError(null);
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
    setOpenModal("cash");
  };

  const field = (label: string, el: React.ReactNode) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-marinha-700">{label}</label>
      {el}
    </div>
  );

  const arColumns = makeFinColumns("Cliente", patchArStatus);
  const apColumns = makeFinColumns("Fornecedor", patchApStatus);

  return (
    <>
      <PageIntro
        title="Financeiro"
        description="Contas a receber, a pagar e lançamentos de caixa (visão simplificada Onda A)."
        badge="Financeiro"
      />

      {summary && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {summary.arOpen !== undefined && (
            <div className="rounded-btn border border-green-200 bg-green-50 p-4">
              <p className="text-xs text-green-700">A receber (em aberto)</p>
              <p className="mt-1 text-lg font-bold text-green-800">{fmt(String(summary.arOpen))}</p>
            </div>
          )}
          {summary.apOpen !== undefined && (
            <div className="rounded-btn border border-red-200 bg-red-50 p-4">
              <p className="text-xs text-red-700">A pagar (em aberto)</p>
              <p className="mt-1 text-lg font-bold text-red-800">{fmt(String(summary.apOpen))}</p>
            </div>
          )}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <Button variant="primary" onClick={() => openFin("ar")} disabled={noBusinessId}>
          Novo a receber
        </Button>
        <Button variant="secondary" onClick={() => openFin("ap")} disabled={noBusinessId}>
          Novo a pagar
        </Button>
        <Button variant="secondary" onClick={openCash} disabled={noBusinessId}>
          Lançamento de caixa
        </Button>
      </div>

      <Card className="mb-6">
        <h2 className="mb-4 font-serif text-lg font-bold text-marinha-900">Contas a receber</h2>
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
        <h2 className="mb-4 font-serif text-lg font-bold text-marinha-900">Contas a pagar</h2>
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
        <h2 className="mb-4 font-serif text-lg font-bold text-marinha-900">Fluxo de caixa</h2>
        <ErpDataTable
          columns={cashColumns}
          data={cash}
          isLoading={cashLoading}
          error={cashError}
          emptyMessage="Nenhum lançamento de caixa."
          onRetry={loadCash}
          keyExtractor={(r) => r.id}
        />
      </Card>

      {/* Modal AR / AP */}
      <ErpFormModal
        title={openModal === "ar" ? "Novo a receber" : "Novo a pagar"}
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
              {parties.map((p) => (
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
            "Observação",
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

      {/* Modal Caixa */}
      <ErpFormModal
        title="Lançamento de caixa"
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
              "Descrição",
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
