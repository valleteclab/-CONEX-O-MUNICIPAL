"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageIntro } from "@/components/layout/page-intro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSelectedBusinessId } from "@/hooks/use-selected-business-id";
import { apiAuthFetch, erpFetch } from "@/lib/api-browser";
import type { ErpListResponse } from "@/lib/erp-list";

type ServiceOrderPriority = "low" | "medium" | "high" | "urgent";

type ServiceAddress = {
  zipCode?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  reference?: string;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  price: string;
  kind?: "product" | "service";
};

type Party = {
  id: string;
  name: string;
  type: string;
  phone?: string | null;
  address?: ServiceAddress;
};

type BusinessMember = {
  id: string;
  userId: string;
  role: string;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
};

type ServiceOrderLine = { productId: string; qty: string; unitPrice: string };

const PRIORITY_LABEL: Record<ServiceOrderPriority, string> = {
  low: "Baixa",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

function createEmptyLine(): ServiceOrderLine {
  return { productId: "", qty: "1", unitPrice: "0" };
}

function calcLineTotal(line: ServiceOrderLine) {
  return Number(line.qty || 0) * Number(line.unitPrice || 0);
}

function fmtMoney(v: string) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(d?: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("pt-BR");
}

function fullAddress(address: ServiceAddress) {
  return [address.street, address.number, address.neighborhood, address.city, address.state, address.zipCode]
    .filter(Boolean)
    .join(", ");
}

function SectionBadge({ index, label }: { index: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-marinha-900 text-sm font-semibold text-white">
        {index}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-marinha-500">{label}</p>
      </div>
    </div>
  );
}

export default function ErpNovaOrdemServicoPage() {
  const businessId = useSelectedBusinessId();
  const noBusinessId = !businessId;
  const [products, setProducts] = useState<Product[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [isLoadingSupport, setIsLoadingSupport] = useState(false);

  const [title, setTitle] = useState("");
  const [partyId, setPartyId] = useState("");
  const [priority, setPriority] = useState<ServiceOrderPriority>("medium");
  const [serviceCategory, setServiceCategory] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [promisedFor, setPromisedFor] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [serviceLocation, setServiceLocation] = useState("");
  const [address, setAddress] = useState<ServiceAddress>({
    zipCode: "",
    street: "",
    number: "",
    neighborhood: "",
    city: "",
    state: "",
    reference: "",
  });
  const [description, setDescription] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [resolution, setResolution] = useState("");
  const [checklistText, setChecklistText] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<ServiceOrderLine[]>([createEmptyLine()]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) {
      setProducts([]);
      setParties([]);
      setMembers([]);
      return;
    }

    let active = true;

    async function loadSupport() {
      setIsLoadingSupport(true);
      const [productRes, partyRes, memberRes] = await Promise.all([
        erpFetch<ErpListResponse<Product>>("/api/v1/erp/products?take=100&skip=0"),
        erpFetch<ErpListResponse<Party>>("/api/v1/erp/parties?take=100&skip=0"),
        apiAuthFetch<BusinessMember[]>(`/api/v1/erp/businesses/${businessId}/members`),
      ]);
      if (!active) return;

      if (productRes.ok && productRes.data) setProducts(productRes.data.items);
      if (partyRes.ok && partyRes.data) setParties(partyRes.data.items.filter((row) => row.type !== "supplier"));
      if (memberRes.ok && memberRes.data) {
        setMembers(memberRes.data.filter((row) => row.isActive));
      } else {
        setMembers([]);
      }
      setIsLoadingSupport(false);
    }

    void loadSupport();
    return () => {
      active = false;
    };
  }, [businessId]);

  function resetForm() {
    setTitle("");
    setPartyId("");
    setPriority("medium");
    setServiceCategory("");
    setScheduledFor("");
    setPromisedFor("");
    setAssignedUserId("");
    setAssignedTo("");
    setContactName("");
    setContactPhone("");
    setServiceLocation("");
    setAddress({
      zipCode: "",
      street: "",
      number: "",
      neighborhood: "",
      city: "",
      state: "",
      reference: "",
    });
    setDescription("");
    setDiagnosis("");
    setResolution("");
    setChecklistText("");
    setNote("");
    setLines([createEmptyLine()]);
    setFormError(null);
    setCreatedId(null);
  }

  function updateLine(index: number, key: keyof ServiceOrderLine, value: string) {
    setLines((current) =>
      current.map((line, currentIndex) => {
        if (currentIndex !== index) return line;

        const next = { ...line, [key]: value };
        if (key === "productId") {
          const product = products.find((row) => row.id === value);
          if (product) next.unitPrice = product.price;
        }

        return next;
      }),
    );
  }

  function addLine() {
    setLines((current) => [...current, createEmptyLine()]);
  }

  function removeLine(index: number) {
    setLines((current) =>
      current.length === 1 ? current : current.filter((_, currentIndex) => currentIndex !== index),
    );
  }

  function updateAddressField(key: keyof ServiceAddress, value: string) {
    setAddress((current) => ({ ...current, [key]: value }));
  }

  function handlePartyChange(nextPartyId: string) {
    setPartyId(nextPartyId);
    const selectedParty = parties.find((row) => row.id === nextPartyId);
    if (!selectedParty) return;

    setContactName((current) => current || selectedParty.name);
    setContactPhone((current) => current || selectedParty.phone || "");
    setAddress((current) => ({
      zipCode: current.zipCode || selectedParty.address?.zipCode || "",
      street: current.street || selectedParty.address?.street || "",
      number: current.number || selectedParty.address?.number || "",
      neighborhood: current.neighborhood || selectedParty.address?.neighborhood || "",
      city: current.city || selectedParty.address?.city || "",
      state: current.state || selectedParty.address?.state || "",
      reference: current.reference || selectedParty.address?.reference || "",
    }));
  }

  function handleAssignedUserChange(nextUserId: string) {
    setAssignedUserId(nextUserId);
    const member = members.find((row) => row.userId === nextUserId);
    setAssignedTo(member?.fullName ?? "");
  }

  async function handleSubmit() {
    const validLines = lines.filter((line) => line.productId && Number(line.qty) > 0);
    const checklist = checklistText
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!title.trim()) {
      setFormError("Informe um titulo para a ordem de servico.");
      return;
    }

    if (!serviceLocation.trim() && !address.street?.trim()) {
      setFormError("Informe pelo menos o local ou endereco de atendimento.");
      return;
    }

    if (validLines.length === 0) {
      setFormError("Adicione pelo menos um item valido.");
      return;
    }

    setIsSubmitting(true);

    const res = await erpFetch<{ id: string }>("/api/v1/erp/service-orders", {
      method: "POST",
      body: JSON.stringify({
        title,
        partyId: partyId || undefined,
        priority,
        serviceCategory: serviceCategory.trim() || undefined,
        scheduledFor: scheduledFor || undefined,
        promisedFor: promisedFor || undefined,
        assignedUserId: assignedUserId || undefined,
        assignedTo: assignedTo.trim() || undefined,
        contactName: contactName.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        serviceLocation: serviceLocation.trim() || undefined,
        serviceAddress: address,
        description: description.trim() || undefined,
        diagnosis: diagnosis.trim() || undefined,
        resolution: resolution.trim() || undefined,
        checklist,
        note: note.trim() || undefined,
        items: validLines,
      }),
    });

    setIsSubmitting(false);

    if (!res.ok || !res.data) {
      setFormError(res.error ?? "Nao foi possivel criar a ordem de servico.");
      return;
    }

    setCreatedId(res.data.id);
    setFormError(null);
  }

  const estimatedTotal = useMemo(
    () => lines.reduce((total, line) => total + calcLineTotal(line), 0),
    [lines],
  );
  const validLinesCount = useMemo(
    () => lines.filter((line) => line.productId && Number(line.qty) > 0).length,
    [lines],
  );
  const checklistCount = useMemo(
    () => checklistText.split("\n").map((item) => item.trim()).filter(Boolean).length,
    [checklistText],
  );
  const serviceAddressPreview = useMemo(() => fullAddress(address), [address]);

  return (
    <>
      <PageIntro
        title="Nova ordem de servico"
        description="Cadastro completo da ordem de servico."
        badge="Servicos"
      >
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/erp/ordens-servico">
            <Button variant="ghost">Voltar para ordens</Button>
          </Link>
        </div>
      </PageIntro>

      <Card variant="featured" className="mb-6 overflow-hidden">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-marinha-500">Abertura da ordem</p>
            <h2 className="mt-2 font-serif text-3xl font-bold text-marinha-900">Cadastro em etapas claras</h2>
            <p className="mt-2 max-w-2xl text-sm text-marinha-600">
              Dados principais, local, itens e informacoes tecnicas ficam organizados para acelerar a abertura sem misturar com a gestao diaria.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <div className="rounded-3xl bg-white/75 p-4">
                <SectionBadge index="1" label="Dados principais" />
              </div>
              <div className="rounded-3xl bg-white/75 p-4">
                <SectionBadge index="2" label="Contato e local" />
              </div>
              <div className="rounded-3xl bg-white/75 p-4">
                <SectionBadge index="3" label="Itens" />
              </div>
              <div className="rounded-3xl bg-white/75 p-4">
                <SectionBadge index="4" label="Informacoes tecnicas" />
              </div>
            </div>
          </div>

          <div className="rounded-[28px] bg-marinha-950 p-5 text-white shadow-xl shadow-marinha-950/10">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Situacao do cadastro</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-white/8 p-4">
                <p className="text-xs uppercase tracking-wide text-white/60">Base de apoio</p>
                <p className="mt-1 text-2xl font-bold">{isLoadingSupport ? "Carregando..." : "Disponivel"}</p>
                <p className="mt-2 text-sm text-white/75">Clientes, itens e equipe carregados para a abertura da OS.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-white/60">Clientes</p>
                  <p className="mt-1 text-xl font-semibold">{parties.length}</p>
                </div>
                <div className="rounded-2xl border border-white/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-white/60">Equipe</p>
                  <p className="mt-1 text-xl font-semibold">{members.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.82fr)]">
        <div className="space-y-6">
          <Card className="border border-marinha-900/10 bg-white">
            <div className="mb-6 flex items-center justify-between gap-3 border-b border-marinha-900/10 pb-4">
              <div>
                <h2 className="font-serif text-2xl font-bold text-marinha-900">Cadastro</h2>
                <p className="mt-1 text-sm text-marinha-500">Preencha os dados e revise o resumo antes de criar a ordem.</p>
              </div>
              <Badge tone="accent">{isLoadingSupport ? "Carregando" : "Pronto"}</Badge>
            </div>

            <div className="space-y-6">
              <section className="rounded-[28px] border border-marinha-900/10 bg-gradient-to-br from-slate-50 to-white p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <SectionBadge index="1" label="Dados principais" />
                  <span className="rounded-full bg-marinha-100 px-3 py-1 text-xs font-semibold text-marinha-700">Obrigatorio</span>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-marinha-700">Titulo da ordem</label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex.: Manutencao corretiva no ar-condicionado"
                      className="focus-ring w-full rounded-btn border-2 border-marinha-900/20 bg-white px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-marinha-700">Cliente</label>
                    <select
                      value={partyId}
                      onChange={(e) => handlePartyChange(e.target.value)}
                      className="focus-ring min-h-[48px] w-full rounded-btn border-2 border-marinha-900/20 bg-white px-4 py-3 text-sm"
                    >
                      <option value="">-- Sem cliente --</option>
                      {parties.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-marinha-700">Categoria do servico</label>
                    <input
                      value={serviceCategory}
                      onChange={(e) => setServiceCategory(e.target.value)}
                      placeholder="Ex.: Instalacao, manutencao, vistoria"
                      className="focus-ring w-full rounded-btn border-2 border-marinha-900/20 bg-white px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-marinha-700">Prioridade</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as ServiceOrderPriority)}
                      className="focus-ring min-h-[48px] w-full rounded-btn border-2 border-marinha-900/20 bg-white px-4 py-3 text-sm"
                    >
                      {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-marinha-700">Responsavel</label>
                    <select
                      value={assignedUserId}
                      onChange={(e) => handleAssignedUserChange(e.target.value)}
                      className="focus-ring min-h-[48px] w-full rounded-btn border-2 border-marinha-900/20 bg-white px-4 py-3 text-sm"
                    >
                      <option value="">-- Selecionar da equipe --</option>
                      {members.map((member) => (
                        <option key={member.userId} value={member.userId}>
                          {member.fullName} - {member.role}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-marinha-700">Agendamento previsto</label>
                    <input
                      type="datetime-local"
                      value={scheduledFor}
                      onChange={(e) => setScheduledFor(e.target.value)}
                      className="focus-ring w-full rounded-btn border-2 border-marinha-900/20 bg-white px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-marinha-700">Data prometida</label>
                    <input
                      type="datetime-local"
                      value={promisedFor}
                      onChange={(e) => setPromisedFor(e.target.value)}
                      className="focus-ring w-full rounded-btn border-2 border-marinha-900/20 bg-white px-4 py-3 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-marinha-700">Descricao</label>
                    <input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Resumo do atendimento"
                      className="focus-ring w-full rounded-btn border-2 border-marinha-900/20 bg-white px-4 py-3 text-sm"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-marinha-900/10 bg-white p-5">
                <div className="mb-4">
                  <SectionBadge index="2" label="Contato e local" />
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-marinha-700">Nome do contato</label>
                    <input
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Pessoa de contato"
                      className="focus-ring w-full rounded-btn border-2 border-marinha-900/20 bg-white px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-marinha-700">Telefone do contato</label>
                    <input
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="Telefone ou WhatsApp"
                      className="focus-ring w-full rounded-btn border-2 border-marinha-900/20 bg-white px-4 py-3 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-marinha-700">Local do atendimento</label>
                    <input
                      value={serviceLocation}
                      onChange={(e) => setServiceLocation(e.target.value)}
                      placeholder="Ex.: Bloco B, recepcao principal, sala 12"
                      className="focus-ring w-full rounded-btn border-2 border-marinha-900/20 bg-white px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-marinha-700">CEP</label>
                    <input value={address.zipCode || ""} onChange={(e) => updateAddressField("zipCode", e.target.value)} className="focus-ring w-full rounded-btn border-2 border-marinha-900/20 bg-white px-4 py-3 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-marinha-700">Rua</label>
                    <input value={address.street || ""} onChange={(e) => updateAddressField("street", e.target.value)} className="focus-ring w-full rounded-btn border-2 border-marinha-900/20 bg-white px-4 py-3 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-marinha-700">Numero</label>
                    <input value={address.number || ""} onChange={(e) => updateAddressField("number", e.target.value)} className="focus-ring w-full rounded-btn border-2 border-marinha-900/20 bg-white px-4 py-3 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-marinha-700">Bairro</label>
                    <input value={address.neighborhood || ""} onChange={(e) => updateAddressField("neighborhood", e.target.value)} className="focus-ring w-full rounded-btn border-2 border-marinha-900/20 bg-white px-4 py-3 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-marinha-700">Cidade</label>
                    <input value={address.city || ""} onChange={(e) => updateAddressField("city", e.target.value)} className="focus-ring w-full rounded-btn border-2 border-marinha-900/20 bg-white px-4 py-3 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-marinha-700">UF</label>
                    <input value={address.state || ""} onChange={(e) => updateAddressField("state", e.target.value)} className="focus-ring w-full rounded-btn border-2 border-marinha-900/20 bg-white px-4 py-3 text-sm" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-marinha-700">Referencia</label>
                    <input
                      value={address.reference || ""}
                      onChange={(e) => updateAddressField("reference", e.target.value)}
                      placeholder="Portaria, ponto de referencia, instrucoes de chegada"
                      className="focus-ring w-full rounded-btn border-2 border-marinha-900/20 bg-white px-4 py-3 text-sm"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-marinha-900/10 bg-white p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <SectionBadge index="3" label="Itens" />
                  <Button variant="ghost" onClick={addLine}>
                    Adicionar item
                  </Button>
                </div>

                <div className="hidden grid-cols-[minmax(0,1.6fr)_120px_150px_150px_44px] gap-3 px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-marinha-500 md:grid">
                  <span>Produto ou servico</span>
                  <span>Qtd</span>
                  <span>Valor unitario</span>
                  <span>Subtotal</span>
                  <span />
                </div>

                <div className="space-y-3">
                  {lines.map((line, index) => (
                    <div
                      key={index}
                      className="grid gap-3 rounded-2xl border border-marinha-900/10 bg-slate-50/70 p-3 md:grid-cols-[minmax(0,1.6fr)_120px_150px_150px_44px] md:items-center"
                    >
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-marinha-500 md:hidden">Produto ou servico</label>
                        <select value={line.productId} onChange={(e) => updateLine(index, "productId", e.target.value)} className="focus-ring min-h-[48px] w-full rounded-btn border-2 border-marinha-900/20 bg-white px-3 py-3 text-sm">
                          <option value="">-- Produto ou servico --</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.sku} - {product.name}
                              {product.kind === "service" ? " (servico)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-marinha-500 md:hidden">Qtd</label>
                        <input type="number" min="0.001" step="0.001" value={line.qty} onChange={(e) => updateLine(index, "qty", e.target.value)} className="focus-ring w-full rounded-btn border-2 border-marinha-900/20 bg-white px-3 py-3 text-sm" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-marinha-500 md:hidden">Valor unitario</label>
                        <input type="number" min="0" step="0.01" value={line.unitPrice} onChange={(e) => updateLine(index, "unitPrice", e.target.value)} className="focus-ring w-full rounded-btn border-2 border-marinha-900/20 bg-white px-3 py-3 text-sm" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-marinha-500 md:hidden">Subtotal</label>
                        <div className="rounded-btn border border-dashed border-marinha-900/20 bg-white px-3 py-3 text-sm font-semibold text-marinha-900">
                          {fmtMoney(String(calcLineTotal(line)))}
                        </div>
                      </div>
                      <div className="flex items-center justify-end">
                        <button type="button" onClick={() => removeLine(index)} aria-label={`Remover item ${index + 1}`} className="rounded-full border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50">
                          Remover
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[28px] border border-marinha-900/10 bg-white p-5">
                <div className="mb-4">
                  <SectionBadge index="4" label="Informacoes tecnicas" />
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-marinha-700">Diagnostico</label>
                    <textarea rows={3} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Problema identificado" className="focus-ring w-full rounded-3xl border-2 border-marinha-900/20 bg-slate-50/40 px-4 py-4 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-marinha-700">Solucao aplicada</label>
                    <textarea rows={3} value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Servico executado" className="focus-ring w-full rounded-3xl border-2 border-marinha-900/20 bg-slate-50/40 px-4 py-4 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-marinha-700">Checklist</label>
                    <textarea rows={4} value={checklistText} onChange={(e) => setChecklistText(e.target.value)} placeholder={"Uma linha por item\nValidar acesso ao local\nTestar equipamento ao final"} className="focus-ring w-full rounded-3xl border-2 border-marinha-900/20 bg-slate-50/40 px-4 py-4 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-marinha-700">Observacoes</label>
                    <textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Informacoes adicionais do atendimento." className="focus-ring w-full rounded-3xl border-2 border-marinha-900/20 bg-slate-50/40 px-4 py-4 text-sm" />
                  </div>
                </div>
              </section>
            </div>
          </Card>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl bg-marinha-950 p-5 text-white shadow-xl shadow-marinha-950/10">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Resumo</p>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl bg-white/8 p-4">
                <p className="text-xs uppercase tracking-wide text-white/60">Valor estimado</p>
                <p className="mt-1 text-2xl font-bold">{fmtMoney(String(estimatedTotal))}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border border-white/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-white/60">Itens validos</p>
                  <p className="mt-1 text-xl font-semibold">{validLinesCount}</p>
                </div>
                <div className="rounded-2xl border border-white/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-white/60">Checklist</p>
                  <p className="mt-1 text-xl font-semibold">{checklistCount}</p>
                </div>
                <div className="rounded-2xl border border-white/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-white/60">Responsavel</p>
                  <p className="mt-1 text-sm font-medium text-white/85">{assignedTo.trim() || "Nao definido"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 p-4 sm:col-span-2 xl:col-span-1">
                  <p className="text-xs uppercase tracking-wide text-white/60">Prazo</p>
                  <p className="mt-1 text-sm font-medium text-white/85">{fmtDate(promisedFor)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-marinha-900/10 bg-slate-50/70 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-marinha-500">Resumo do cadastro</h3>
            <div className="mt-4 space-y-3 text-sm text-marinha-600">
              <p>Titulo: <strong>{title.trim() || "Nao informado"}</strong></p>
              <p>Prioridade: <strong>{PRIORITY_LABEL[priority]}</strong></p>
              <p>Cliente: <strong>{parties.find((row) => row.id === partyId)?.name || "Nao informado"}</strong></p>
              <p>Prazo: <strong>{fmtDate(promisedFor)}</strong></p>
              <p>Local: <strong>{serviceLocation || serviceAddressPreview || "Nao informado"}</strong></p>
            </div>
          </div>

          {createdId ? (
            <div className="rounded-3xl border border-green-200 bg-green-50 p-5 text-sm text-green-700">
              Ordem criada com sucesso.
              <div className="mt-3 flex flex-wrap gap-3">
                <Link href={`/erp/ordens-servico/${createdId}`}>
                  <Button variant="primary">Abrir OS</Button>
                </Link>
                <Button variant="ghost" onClick={resetForm}>Nova ordem</Button>
              </div>
            </div>
          ) : null}

          {formError ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {formError}
            </div>
          ) : null}

          <div className="sticky top-24 rounded-[28px] border border-marinha-900/10 bg-white p-4 shadow-lg shadow-marinha-900/5">
            <div className="flex flex-col gap-3">
              <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting || noBusinessId}>
                {isSubmitting ? "Salvando..." : "Criar OS"}
              </Button>
              <Button variant="ghost" onClick={resetForm} disabled={isSubmitting}>
                Limpar formulario
              </Button>
              <Link href="/erp/ordens-servico">
                <Button variant="ghost">Cancelar</Button>
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
