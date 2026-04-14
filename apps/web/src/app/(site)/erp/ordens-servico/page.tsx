"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ErpDataTable, type ErpColumn } from "@/components/erp/erp-data-table";
import { PageIntro } from "@/components/layout/page-intro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSelectedBusinessId } from "@/hooks/use-selected-business-id";
import { apiAuthFetch, erpFetch } from "@/lib/api-browser";
import type { ErpListResponse } from "@/lib/erp-list";

type ServiceOrderPriority = "low" | "medium" | "high" | "urgent";
type ServiceOrderStatus = "draft" | "scheduled" | "in_progress" | "completed" | "cancelled";

type ServiceAddress = {
  zipCode?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  reference?: string;
};

type ServiceOrder = {
  id: string;
  title: string;
  partyId: string | null;
  status: ServiceOrderStatus;
  priority: ServiceOrderPriority;
  serviceCategory: string | null;
  totalAmount: string;
  scheduledFor: string | null;
  promisedFor: string | null;
  assignedTo: string | null;
  assignedUserId: string | null;
  serviceLocation: string | null;
  contactName: string | null;
  contactPhone: string | null;
  diagnosis: string | null;
  resolution: string | null;
  checklist: string[];
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  party?: { name: string };
  assignedUser?: { id: string; fullName: string } | null;
  createdByUser?: { id: string; fullName: string } | null;
  startedByUser?: { id: string; fullName: string } | null;
  completedByUser?: { id: string; fullName: string } | null;
  cancelledByUser?: { id: string; fullName: string } | null;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  price: string;
  kind?: "product" | "service";
};

type Party = { id: string; name: string; type: string; phone?: string | null; address?: ServiceAddress };
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

const TAKE = 50;

function createEmptyLine(): ServiceOrderLine {
  return { productId: "", qty: "1", unitPrice: "0" };
}

function fmtMoney(v: string) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(d?: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("pt-BR");
}

function fmtDateTime(d?: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleString("pt-BR");
}

function calcLineTotal(line: ServiceOrderLine) {
  return Number(line.qty || 0) * Number(line.unitPrice || 0);
}

function fullAddress(address: ServiceAddress) {
  return [address.street, address.number, address.neighborhood, address.city, address.state, address.zipCode]
    .filter(Boolean)
    .join(", ");
}

function fmtDurationSince(date?: string | null) {
  if (!date) return "-";
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  const days = Math.floor(diffMinutes / 1440);
  const hours = Math.floor((diffMinutes % 1440) / 60);
  const minutes = diffMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

function getLifecycleStage(order: ServiceOrder) {
  if (order.status === "completed") return "Concluida";
  if (order.status === "cancelled") return "Cancelada";
  if (order.status === "in_progress") return "Em campo";
  if (order.status === "scheduled") return "Agendada";
  return "Triagem";
}

function getCurrentOwner(order: ServiceOrder) {
  return order.assignedUser?.fullName ?? order.assignedTo ?? order.startedByUser?.fullName ?? "-";
}

function getStageStartedAt(order: ServiceOrder) {
  if (order.status === "in_progress") return order.startedAt ?? order.createdAt;
  if (order.status === "scheduled") return order.scheduledFor ?? order.createdAt;
  if (order.status === "completed") return order.completedAt ?? order.createdAt;
  if (order.status === "cancelled") return order.cancelledAt ?? order.createdAt;
  return order.createdAt;
}

function getOperationalHealth(order: ServiceOrder) {
  if (order.status === "completed") return { label: "Finalizada", tone: "text-green-700 bg-green-100" };
  if (order.status === "cancelled") return { label: "Encerrada", tone: "text-red-700 bg-red-100" };
  if (order.promisedFor && new Date(order.promisedFor).getTime() < Date.now()) {
    return { label: "Atrasada", tone: "text-red-700 bg-red-100" };
  }
  if (!order.assignedUserId && !order.assignedTo) {
    return { label: "Sem dono", tone: "text-amber-700 bg-amber-100" };
  }
  if (order.status === "in_progress") {
    return { label: "Em execucao", tone: "text-amber-700 bg-amber-100" };
  }
  return { label: "Sob controle", tone: "text-marinha-700 bg-marinha-100" };
}

const STATUS_LABEL: Record<ServiceOrderStatus, string> = {
  draft: "Rascunho",
  scheduled: "Agendada",
  in_progress: "Em andamento",
  completed: "Concluida",
  cancelled: "Cancelada",
};

const STATUS_COLOR: Record<ServiceOrderStatus, string> = {
  draft: "bg-marinha-100 text-marinha-700",
  scheduled: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const PRIORITY_LABEL: Record<ServiceOrderPriority, string> = {
  low: "Baixa",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

const PRIORITY_COLOR: Record<ServiceOrderPriority, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-marinha-100 text-marinha-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

export default function ErpOrdensServicoPage() {
  const businessId = useSelectedBusinessId();
  const noBusinessId = !businessId;
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

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

  const load = useCallback(
    async (reset = false) => {
      setIsLoading(true);
      setError(null);
      const currentSkip = reset ? 0 : skip;
      const res = await erpFetch<ErpListResponse<ServiceOrder>>(
        `/api/v1/erp/service-orders?take=${TAKE}&skip=${currentSkip}`,
      );

      if (res.ok && res.data) {
        const { items, total } = res.data;
        setOrders((prev) => (reset ? items : [...prev, ...items]));
        setSkip(currentSkip + items.length);
        setHasMore(currentSkip + items.length < total);
      } else {
        setError(res.error ?? "Erro ao carregar ordens de servico.");
      }

      setIsLoading(false);
    },
    [skip],
  );

  const loadSupport = useCallback(async () => {
    if (!businessId) return;

    const [productRes, partyRes, memberRes] = await Promise.all([
      erpFetch<ErpListResponse<Product>>("/api/v1/erp/products?take=100&skip=0"),
      erpFetch<ErpListResponse<Party>>("/api/v1/erp/parties?take=100&skip=0"),
      apiAuthFetch<BusinessMember[]>(`/api/v1/erp/businesses/${businessId}/members`),
    ]);

    if (productRes.ok && productRes.data) setProducts(productRes.data.items);
    if (partyRes.ok && partyRes.data) {
      setParties(partyRes.data.items.filter((row) => row.type !== "supplier"));
    }
    if (memberRes.ok && memberRes.data) {
      setMembers(memberRes.data.filter((row) => row.isActive));
    } else {
      setMembers([]);
    }
  }, [businessId]);

  useEffect(() => {
    if (noBusinessId) {
      setOrders([]);
      setProducts([]);
      setParties([]);
      setMembers([]);
      setHasMore(false);
      setSkip(0);
      setComposerOpen(false);
      return;
    }

    load(true);
    void loadSupport();
  }, [businessId, load, loadSupport, noBusinessId]);

  async function patchStatus(id: string, status: ServiceOrderStatus) {
    const res = await erpFetch<ServiceOrder>(`/api/v1/erp/service-orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });

    if (!res.ok || !res.data) {
      setError(res.error ?? "Nao foi possivel atualizar a ordem de servico.");
      return;
    }

    setOrders((prev) => prev.map((row) => (row.id === id ? res.data! : row)));
  }

  function resetComposer() {
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
  }

  function openComposer() {
    resetComposer();
    setComposerOpen(true);
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

    const res = await erpFetch<ServiceOrder>("/api/v1/erp/service-orders", {
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

    setOrders((prev) => [res.data!, ...prev]);
    setComposerOpen(false);
    resetComposer();
  }

  const activeOrders = useMemo(
    () => orders.filter((row) => row.status !== "completed" && row.status !== "cancelled"),
    [orders],
  );
  const scheduledOrders = useMemo(() => orders.filter((row) => row.status === "scheduled"), [orders]);
  const inProgressOrders = useMemo(() => orders.filter((row) => row.status === "in_progress"), [orders]);
  const completedOrders = useMemo(() => orders.filter((row) => row.status === "completed"), [orders]);
  const completedAmount = useMemo(
    () => completedOrders.reduce((total, row) => total + Number(row.totalAmount || 0), 0),
    [completedOrders],
  );
  const oldestOpenOrder = useMemo(() => {
    const openOrders = orders.filter((row) => row.status !== "completed" && row.status !== "cancelled");
    return openOrders.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0] ?? null;
  }, [orders]);
  const overdueOrders = useMemo(
    () =>
      orders.filter(
        (row) =>
          row.promisedFor &&
          row.status !== "completed" &&
          row.status !== "cancelled" &&
          new Date(row.promisedFor).getTime() < Date.now(),
      ),
    [orders],
  );
  const unassignedActiveOrders = useMemo(
    () => activeOrders.filter((row) => !row.assignedUserId && !row.assignedTo),
    [activeOrders],
  );
  const managerRadarOrders = useMemo(() => {
    const score = (row: ServiceOrder) => {
      let total = 0;
      if (row.status === "in_progress") total += 40;
      if (row.priority === "urgent") total += 35;
      if (row.priority === "high") total += 20;
      if (row.promisedFor && new Date(row.promisedFor).getTime() < Date.now()) total += 45;
      if (!row.assignedUserId && !row.assignedTo) total += 25;
      total += Math.min(30, Math.floor((Date.now() - new Date(row.createdAt).getTime()) / 3600000));
      return total;
    };

    return [...activeOrders].sort((a, b) => score(b) - score(a)).slice(0, 5);
  }, [activeOrders]);
  const lifecycleBuckets = useMemo(
    () => [
      {
        label: "Triagem",
        helper: "Ainda nao foi para agenda",
        count: orders.filter((row) => row.status === "draft").length,
      },
      {
        label: "Agendadas",
        helper: "Com data prometida ou visita prevista",
        count: scheduledOrders.length,
      },
      {
        label: "Em campo",
        helper: "Equipe ja iniciou a execucao",
        count: inProgressOrders.length,
      },
      {
        label: "Concluidas",
        helper: "Servico encerrado com baixa e financeiro",
        count: completedOrders.length,
      },
    ],
    [orders, scheduledOrders.length, inProgressOrders.length, completedOrders.length],
  );
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

  const columns: ErpColumn<ServiceOrder>[] = [
    {
      key: "title",
      label: "OS",
      render: (row) => (
        <div>
          <Link href={`/erp/ordens-servico/${row.id}`} className="font-semibold text-marinha-900 transition hover:text-marinha-700 hover:underline">
            {row.title}
          </Link>
          <div className="mt-1 flex flex-wrap gap-2 text-xs">
            <span className={`rounded-full px-2 py-0.5 font-semibold ${PRIORITY_COLOR[row.priority]}`}>
              {PRIORITY_LABEL[row.priority]}
            </span>
            {row.serviceCategory ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                {row.serviceCategory}
              </span>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      key: "client",
      label: "Cliente",
      render: (row) => (
        <div className="text-sm text-marinha-700">
          <div>{row.party?.name ?? row.contactName ?? "-"}</div>
          <div className="text-xs text-marinha-500">{row.contactPhone || "-"}</div>
        </div>
      ),
    },
    {
      key: "agenda",
      label: "Agenda",
      render: (row) => (
        <div className="text-sm text-marinha-700">
          <div>Prevista: {fmtDate(row.scheduledFor)}</div>
          <div className="text-xs text-marinha-500">Promessa: {fmtDate(row.promisedFor)}</div>
        </div>
      ),
    },
    {
      key: "where",
      label: "Onde esta",
      render: (row) => (
        <div className="text-sm text-marinha-700">
          <div>{getLifecycleStage(row)}</div>
          <div className="text-xs text-marinha-500">{row.serviceLocation ?? "Local nao informado"}</div>
          <div className="text-xs text-marinha-500">Etapa ha {fmtDurationSince(getStageStartedAt(row))}</div>
        </div>
      ),
    },
    {
      key: "assigned",
      label: "Quem esta fazendo",
      render: (row) => (
        <div className="text-sm text-marinha-700">
          <div>{getCurrentOwner(row)}</div>
          <div className="text-xs text-marinha-500">
            {row.status === "in_progress"
              ? `Iniciou: ${row.startedByUser?.fullName ?? "-"}`
              : `Designada para: ${row.assignedUser?.fullName ?? row.assignedTo ?? "-"}`}
          </div>
        </div>
      ),
    },
    {
      key: "lifecycle",
      label: "Ciclo de vida",
      render: (row) => (
        <div className="space-y-1 text-xs text-marinha-600">
          <div>Aberta por: <strong>{row.createdByUser?.fullName ?? "-"}</strong></div>
          <div>Aberta ha: <strong>{fmtDurationSince(row.createdAt)}</strong></div>
          <div>Iniciada por: <strong>{row.startedByUser?.fullName ?? "-"}</strong></div>
          <div>Inicio: <strong>{fmtDateTime(row.startedAt)}</strong></div>
          <div>Responsavel atual: <strong>{getCurrentOwner(row)}</strong></div>
          {row.completedAt ? (
            <div>Concluida por: <strong>{row.completedByUser?.fullName ?? "-"}</strong></div>
          ) : null}
          {row.cancelledAt ? (
            <div>Cancelada por: <strong>{row.cancelledByUser?.fullName ?? "-"}</strong></div>
          ) : null}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[row.status]}`}>
          {STATUS_LABEL[row.status]}
        </span>
      ),
    },
    {
      key: "total",
      label: "Total",
      render: (row) => fmtMoney(row.totalAmount),
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/erp/ordens-servico/${row.id}`}
            className="rounded-btn border border-marinha-900/20 px-2 py-1 text-xs font-semibold text-marinha-700 transition hover:bg-marinha-50"
          >
            Abrir
          </Link>
          {row.status === "draft" ? (
            <>
              <button
                onClick={() => patchStatus(row.id, "scheduled")}
                className="rounded-btn bg-blue-600 px-2 py-1 text-xs font-semibold text-white"
              >
                Agendar
              </button>
              <button
                onClick={() => patchStatus(row.id, "cancelled")}
                className="rounded-btn border border-red-300 px-2 py-1 text-xs font-semibold text-red-600"
              >
                Cancelar
              </button>
            </>
          ) : null}
          {row.status === "scheduled" ? (
            <>
              <button
                onClick={() => patchStatus(row.id, "in_progress")}
                className="rounded-btn bg-amber-500 px-2 py-1 text-xs font-semibold text-white"
              >
                Iniciar
              </button>
              <button
                onClick={() => patchStatus(row.id, "completed")}
                className="rounded-btn border border-green-400 px-2 py-1 text-xs font-semibold text-green-700"
              >
                Concluir
              </button>
            </>
          ) : null}
          {row.status === "in_progress" ? (
            <button
              onClick={() => patchStatus(row.id, "completed")}
              className="rounded-btn bg-green-600 px-2 py-1 text-xs font-semibold text-white"
            >
              Concluir
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageIntro
        title="Ordens de servico"
        description="Acompanhe abertura, agenda, execucao e conclusao das ordens de servico."
        badge="Servicos"
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card variant="featured">
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Ordens abertas</p>
          <p className="mt-2 text-lg font-bold text-marinha-900">{activeOrders.length} ativas</p>
          <p className="mt-1 text-sm text-marinha-500">Ordens em andamento no fluxo.</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Agendadas e em andamento</p>
          <p className="mt-2 text-lg font-bold text-marinha-900">{scheduledOrders.length + inProgressOrders.length}</p>
          <p className="mt-1 text-sm text-marinha-500">Ordens com atendimento previsto ou iniciado.</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Receita concluida</p>
          <p className="mt-2 text-lg font-bold text-marinha-900">{fmtMoney(String(completedAmount))}</p>
          <p className="mt-1 text-sm text-marinha-500">Volume concluido e refletido no financeiro.</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">OS mais antiga aberta</p>
          <p className="mt-2 text-lg font-bold text-marinha-900">
            {oldestOpenOrder ? fmtDurationSince(oldestOpenOrder.createdAt) : "-"}
          </p>
          <p className="mt-1 text-sm text-marinha-500">
            {oldestOpenOrder ? oldestOpenOrder.title : "Nenhuma OS aberta no momento."}
          </p>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(320px,0.85fr)]">
        <Card className="border border-marinha-900/10 bg-white">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-marinha-900/10 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-marinha-500">Nova ordem de servico</p>
              <h2 className="mt-2 font-serif text-2xl font-bold text-marinha-900">
                {composerOpen ? "Cadastro de ordem de servico" : "Registrar nova ordem"}
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" onClick={openComposer} disabled={noBusinessId}>
                {composerOpen ? "Reiniciar formulario" : "Nova OS"}
              </Button>
              {composerOpen ? (
                <Button variant="ghost" onClick={() => setComposerOpen(false)} disabled={isSubmitting}>
                  Fechar painel
                </Button>
              ) : null}
            </div>
          </div>

          {composerOpen ? (
            <div className="grid gap-6 pt-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.82fr)]">
              <div className="space-y-6">
                <section className="rounded-3xl border border-marinha-900/10 bg-slate-50/70 p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-marinha-500">Dados principais</h3>
                    </div>
                    <Badge tone="accent">Cadastro</Badge>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-marinha-700">Titulo da ordem</label>
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ex.: Manutencao corretiva no ar-condicionado da recepcao"
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
                      <label className="mb-1 block text-sm font-medium text-marinha-700">Descricao rapida</label>
                      <input
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Resumo do atendimento"
                        className="focus-ring w-full rounded-btn border-2 border-marinha-900/20 bg-white px-4 py-3 text-sm"
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-marinha-900/10 bg-white p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-marinha-500">Contato e local</h3>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-marinha-700">Nome do contato</label>
                      <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Quem vai receber a equipe" className="focus-ring w-full rounded-btn border-2 border-marinha-900/20 bg-white px-4 py-3 text-sm" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-marinha-700">Telefone do contato</label>
                      <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="WhatsApp ou telefone" className="focus-ring w-full rounded-btn border-2 border-marinha-900/20 bg-white px-4 py-3 text-sm" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-marinha-700">Local da execucao</label>
                      <input value={serviceLocation} onChange={(e) => setServiceLocation(e.target.value)} placeholder="Ex.: Bloco B, recepcao principal, sala 12" className="focus-ring w-full rounded-btn border-2 border-marinha-900/20 bg-white px-4 py-3 text-sm" />
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
                      <label className="mb-1 block text-sm font-medium text-marinha-700">Referencia de acesso</label>
                      <input value={address.reference || ""} onChange={(e) => updateAddressField("reference", e.target.value)} placeholder="Portaria, ponto de referencia, instrucoes para chegada" className="focus-ring w-full rounded-btn border-2 border-marinha-900/20 bg-white px-4 py-3 text-sm" />
                    </div>
                  </div>
                </section>
                <section className="rounded-3xl border border-marinha-900/10 bg-white p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-marinha-500">Itens</h3>
                    </div>
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
                            <option value="">-- Produto/servico --</option>
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
                            x
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-3xl border border-marinha-900/10 bg-white p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-marinha-500">Informacoes tecnicas</h3>

                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-marinha-700">Diagnostico</label>
                      <textarea rows={3} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Problema identificado antes da execucao" className="focus-ring w-full rounded-3xl border-2 border-marinha-900/20 bg-slate-50/40 px-4 py-4 text-sm" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-marinha-700">Solucao aplicada</label>
                      <textarea rows={3} value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="O que sera feito ou foi feito na OS" className="focus-ring w-full rounded-3xl border-2 border-marinha-900/20 bg-slate-50/40 px-4 py-4 text-sm" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-marinha-700">Checklist operacional</label>
                      <textarea rows={4} value={checklistText} onChange={(e) => setChecklistText(e.target.value)} placeholder={"Uma linha por item\nValidar acesso ao local\nConfirmar energia desligada\nTestar equipamento ao final"} className="focus-ring w-full rounded-3xl border-2 border-marinha-900/20 bg-slate-50/40 px-4 py-4 text-sm" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-marinha-700">Observacoes operacionais</label>
                      <textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contexto adicional para equipe, acesso, risco, combinados ou informacoes do cliente." className="focus-ring w-full rounded-3xl border-2 border-marinha-900/20 bg-slate-50/40 px-4 py-4 text-sm" />
                    </div>
                  </div>
                </section>
              </div>

              <aside className="space-y-4">
                <div className="rounded-3xl bg-marinha-950 p-5 text-white shadow-xl shadow-marinha-950/10">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Resumo da abertura</p>
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
                        <p className="mt-1 text-sm font-medium text-white/85">{assignedTo.trim() || "Nao definido ainda"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-marinha-900/10 bg-slate-50/70 p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-marinha-500">Resumo</h3>
                  <div className="mt-4 space-y-3 text-sm text-marinha-600">
                    <p>Prioridade: <strong>{PRIORITY_LABEL[priority]}</strong></p>
                    <p>Cliente: <strong>{parties.find((row) => row.id === partyId)?.name || "Nao informado"}</strong></p>
                    <p>Promessa: <strong>{fmtDate(promisedFor)}</strong></p>
                    <p>Local: <strong>{serviceLocation || serviceAddressPreview || "Nao informado"}</strong></p>
                  </div>
                </div>

                {formError ? (
                  <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                    {formError}
                  </div>
                ) : null}

                <div className="sticky top-24 rounded-3xl border border-marinha-900/10 bg-white p-4 shadow-lg shadow-marinha-900/5">
                  <div className="flex flex-col gap-3">
                    <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
                      {isSubmitting ? "Salvando..." : "Criar OS"}
                    </Button>
                    <Button variant="ghost" onClick={() => setComposerOpen(false)} disabled={isSubmitting}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </aside>
            </div>
          ) : (
            <div className="grid gap-4 pt-6 md:grid-cols-3">
              <div className="rounded-3xl border border-dashed border-marinha-900/15 bg-slate-50/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Cliente e local</p>
                <p className="mt-2 text-sm text-marinha-600">Cadastre contato, local e prazo do atendimento.</p>
              </div>
              <div className="rounded-3xl border border-dashed border-marinha-900/15 bg-slate-50/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Responsavel e status</p>
                <p className="mt-2 text-sm text-marinha-600">Acompanhe responsavel e status da ordem.</p>
              </div>
              <div className="rounded-3xl border border-dashed border-marinha-900/15 bg-slate-50/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Itens e observacoes</p>
                <p className="mt-2 text-sm text-marinha-600">Registre materiais, servicos e informacoes do atendimento.</p>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Painel rapido</p>
          <p className="mt-2 text-lg font-bold text-marinha-900">{products.length} itens disponiveis</p>
          <p className="mt-1 text-sm text-marinha-500">Base unificada de materiais e servicos.</p>

          <div className="mt-4 space-y-3">
            <div className="rounded-2xl bg-slate-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Em andamento</p>
              <p className="mt-1 text-lg font-bold text-marinha-900">{inProgressOrders.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Concluidas</p>
              <p className="mt-1 text-lg font-bold text-marinha-900">{completedOrders.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Sem responsavel</p>
              <p className="mt-1 text-lg font-bold text-marinha-900">{orders.filter((row) => !row.assignedUserId && !row.assignedTo).length}</p>
            </div>
            <div className="rounded-2xl bg-slate-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Urgentes</p>
              <p className="mt-1 text-lg font-bold text-marinha-900">{orders.filter((row) => row.priority === "urgent").length}</p>
            </div>
            <div className="rounded-2xl bg-slate-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Atrasadas</p>
              <p className="mt-1 text-lg font-bold text-marinha-900">{overdueOrders.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Equipe disponivel</p>
              <p className="mt-1 text-lg font-bold text-marinha-900">{members.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_380px]">
          <div>
            <div className="mb-4">
              <h2 className="font-serif text-lg font-bold text-marinha-900">Visao geral</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {lifecycleBuckets.map((bucket) => (
                <div key={bucket.label} className="rounded-3xl border border-marinha-900/10 bg-slate-50/70 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-marinha-500">{bucket.label}</p>
                  <p className="mt-2 text-3xl font-bold text-marinha-900">{bucket.count}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-3xl border border-marinha-900/10 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-marinha-500">Ordens prioritarias</h3>
                </div>
                <Badge tone="accent">{managerRadarOrders.length} em foco</Badge>
              </div>

              <div className="mt-4 space-y-3">
                {managerRadarOrders.length ? (
                  managerRadarOrders.map((order) => {
                    const health = getOperationalHealth(order);
                    return (
                      <div key={order.id} className="rounded-2xl border border-marinha-900/10 bg-slate-50/70 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-marinha-900">{order.title}</p>
                            <p className="mt-1 text-sm text-marinha-500">
                              {order.party?.name ?? order.contactName ?? "Cliente nao informado"} • {getLifecycleStage(order)}
                            </p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${health.tone}`}>{health.label}</span>
                        </div>

                        <div className="mt-3 grid gap-3 text-sm text-marinha-600 md:grid-cols-2">
                          <p>Responsavel: <strong>{getCurrentOwner(order)}</strong></p>
                          <p>Aberta ha: <strong>{fmtDurationSince(order.createdAt)}</strong></p>
                          <p>Local: <strong>{order.serviceLocation ?? "Nao informado"}</strong></p>
                          <p>Promessa: <strong>{fmtDateTime(order.promisedFor)}</strong></p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-marinha-900/15 bg-slate-50/70 p-5 text-sm text-marinha-500">
                    Nenhuma ordem em destaque no momento.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-marinha-950 p-5 text-white shadow-xl shadow-marinha-950/10">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Indicadores</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-white/8 p-4">
                <p className="text-xs uppercase tracking-wide text-white/60">OS mais antiga aberta</p>
                <p className="mt-1 text-xl font-semibold">
                  {oldestOpenOrder ? fmtDurationSince(oldestOpenOrder.createdAt) : "-"}
                </p>
                <p className="mt-2 text-sm text-white/75">{oldestOpenOrder?.title ?? "Nenhuma ordem aberta"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-white/60">Em campo agora</p>
                <p className="mt-1 text-xl font-semibold">{inProgressOrders.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-white/60">Atrasadas</p>
                <p className="mt-1 text-xl font-semibold">{overdueOrders.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-white/60">Sem dono</p>
                <p className="mt-1 text-xl font-semibold">{unassignedActiveOrders.length}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg font-bold text-marinha-900">Lista de ordens</h2>
            <p className="mt-1 text-sm text-marinha-500">Acompanhe status, responsavel, prazo e atendimento.</p>
          </div>
          <Badge tone="accent">Conclusao baixa estoque e gera recebivel</Badge>
        </div>

        <ErpDataTable
          columns={columns}
          data={orders}
          isLoading={isLoading}
          error={error}
          emptyMessage="Nenhuma ordem de servico cadastrada."
          onRetry={() => load(true)}
          onLoadMore={() => load(false)}
          hasMore={hasMore}
          keyExtractor={(row) => row.id}
        />
      </Card>
    </>
  );
}
