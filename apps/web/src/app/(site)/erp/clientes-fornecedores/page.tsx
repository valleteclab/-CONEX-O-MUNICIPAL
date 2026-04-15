"use client";

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

type Party = {
  id: string;
  type: "customer" | "supplier" | "both";
  name: string;
  legalName: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
};

type CreateForm = {
  type: "customer" | "supplier" | "both";
  name: string;
  legalName: string;
  document: string;
  email: string;
  phone: string;
};

const EMPTY_FORM: CreateForm = {
  type: "customer",
  name: "",
  legalName: "",
  document: "",
  email: "",
  phone: "",
};

const TAKE = 50;

const TYPE_LABELS: Record<string, string> = {
  customer: "Cliente",
  supplier: "Fornecedor",
  both: "Ambos",
};

const TYPE_COLORS: Record<string, string> = {
  customer: "bg-blue-100 text-blue-700",
  supplier: "bg-purple-100 text-purple-700",
  both: "bg-teal-100 text-teal-700",
};

const columns: ErpColumn<Party>[] = [
  {
    key: "type",
    label: "Tipo",
    render: (r) => (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_COLORS[r.type]}`}>
        {TYPE_LABELS[r.type]}
      </span>
    ),
  },
  { key: "name", label: "Nome", render: (r) => r.name },
  { key: "document", label: "CPF/CNPJ", render: (r) => r.document ?? "—" },
  { key: "email", label: "E-mail", render: (r) => r.email ?? "—" },
  { key: "phone", label: "Telefone", render: (r) => r.phone ?? "—" },
];

export default function ErpPartiesPage() {
  const [parties, setParties] = useState<Party[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [skip, setSkip] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const customerCount = parties.filter((party) => party.type === "customer").length;
  const supplierCount = parties.filter((party) => party.type === "supplier").length;
  const bothCount = parties.filter((party) => party.type === "both").length;

  const businessId = useSelectedBusinessId();
  const noBusinessId = !businessId;

  const load = useCallback(
    async (reset = false) => {
      setIsLoading(true);
      setError(null);
      const currentSkip = reset ? 0 : skip;
      const res = await erpFetch<ErpListResponse<Party>>(
        `/api/v1/erp/parties?take=${TAKE}&skip=${currentSkip}`,
      );
      if (res.ok && res.data) {
        const { items, total } = res.data;
        setParties((prev) => (reset ? items : [...prev, ...items]));
        setSkip(currentSkip + items.length);
        setHasMore(currentSkip + items.length < total);
      } else {
        setError(res.error ?? "Erro ao carregar cadastros.");
      }
      setIsLoading(false);
    },
    [skip],
  );

  useEffect(() => {
    if (noBusinessId) {
      setParties([]);
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
    if (!form.name.trim()) {
      setFormError("Nome é obrigatório.");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    const payload = {
      type: form.type,
      name: form.name,
      ...(form.legalName ? { legalName: form.legalName } : {}),
      ...(form.document ? { document: form.document } : {}),
      ...(form.email ? { email: form.email } : {}),
      ...(form.phone ? { phone: form.phone } : {}),
    };
    const res = await erpFetch<Party>("/api/v1/erp/parties", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (res.ok && res.data) {
      setParties((prev) => [res.data!, ...prev]);
      setModalOpen(false);
    } else {
      setFormError(res.error ?? "Erro ao criar cadastro.");
    }
    setIsSubmitting(false);
  };

  const field = (label: string, el: React.ReactNode) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-marinha-700">{label}</label>
      {el}
    </div>
  );

  const textInput = (key: keyof CreateForm, type = "text") => (
    <input
      type={type}
      value={form[key]}
      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
    />
  );

  return (
    <>
      <PageIntro
        title="Clientes e fornecedores"
        description="Organize os contatos usados em vendas, compras e financeiro em um só lugar."
        badge="Cadastros"
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card variant="featured">
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Cadastros</p>
          <p className="mt-2 text-lg font-bold text-marinha-900">{parties.length}</p>
          <p className="mt-1 text-sm text-marinha-500">Contatos disponíveis no ERP.</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Clientes</p>
          <p className="mt-2 text-lg font-bold text-marinha-900">{customerCount}</p>
          <p className="mt-1 text-sm text-marinha-500">Contatos usados em vendas e atendimento.</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Fornecedores</p>
          <p className="mt-2 text-lg font-bold text-marinha-900">{supplierCount}</p>
          <p className="mt-1 text-sm text-marinha-500">Parceiros para compras e abastecimento.</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Mistos</p>
          <p className="mt-2 text-lg font-bold text-marinha-900">{bothCount}</p>
          <p className="mt-1 text-sm text-marinha-500">Contatos que compram e também fornecem.</p>
        </Card>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <Button variant="primary" onClick={openModal} disabled={noBusinessId}>
          Novo cadastro
        </Button>
        <Badge tone="accent" className="self-center">Relacionamento</Badge>
      </div>
      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg font-bold text-marinha-900">Base de clientes e fornecedores</h2>
            <p className="mt-1 text-sm text-marinha-500">Centralize aqui os contatos que fazem parte da rotina da empresa.</p>
          </div>
          <Badge tone="neutral">Contatos</Badge>
        </div>
        <ErpDataTable
          columns={columns}
          data={parties}
          isLoading={isLoading}
          error={error}
          emptyMessage="Nenhum cliente ou fornecedor cadastrado ainda."
          onRetry={() => load(true)}
          keyExtractor={(r) => r.id}
          hasMore={hasMore}
          onLoadMore={() => load(false)}
        />
      </Card>

      <ErpFormModal
        title="Novo cadastro"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      >
        <p className="mb-4 text-sm text-marinha-500">
          Cadastre pessoas ou empresas para usar nos pedidos, no financeiro e no atendimento.
        </p>
        <div className="grid grid-cols-2 gap-4">
          {field(
            "Tipo *",
            <select
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({ ...f, type: e.target.value as CreateForm["type"] }))
              }
              className="rounded-btn border border-marinha-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-municipal-500"
            >
              <option value="customer">Cliente</option>
              <option value="supplier">Fornecedor</option>
              <option value="both">Ambos</option>
            </select>,
          )}
          {field("CPF/CNPJ", textInput("document"))}
          <div className="col-span-2">{field("Nome *", textInput("name"))}</div>
          <div className="col-span-2">{field("Razão social", textInput("legalName"))}</div>
          {field("E-mail", textInput("email", "email"))}
          {field("Telefone", textInput("phone", "tel"))}
        </div>
        {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
      </ErpFormModal>
    </>
  );
}
