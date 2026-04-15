"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ErpDataTable, type ErpColumn } from "@/components/erp/erp-data-table";
import { PageIntro } from "@/components/layout/page-intro";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSelectedBusinessId } from "@/hooks/use-selected-business-id";
import { erpFetch } from "@/lib/api-browser";
import type { ErpListResponse } from "@/lib/erp-list";

type ServiceOrderPriority = "low" | "medium" | "high" | "urgent";
type ServiceOrderStatus = "draft" | "scheduled" | "in_progress" | "completed" | "cancelled";

type ServiceOrder = {
  id: string;
  title: string;
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
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  party?: { name: string };
  assignedUser?: { id: string; fullName: string } | null;
  createdByUser?: { id: string; fullName: string } | null;
  startedByUser?: { id: string; fullName: string } | null;
  completedByUser?: { id: string; fullName: string } | null;
  cancelledByUser?: { id: string; fullName: string } | null;
};

const TAKE = 50;

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
  if (order.status === "completed") return "Concluída";
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
  if (order.status === "cancelled") return { label: "Cancelada", tone: "text-red-700 bg-red-100" };
  if (order.promisedFor && new Date(order.promisedFor).getTime() < Date.now()) {
    return { label: "Atrasada", tone: "text-red-700 bg-red-100" };
  }
  if (!order.assignedUserId && !order.assignedTo) {
    return { label: "Sem responsável", tone: "text-amber-700 bg-amber-100" };
  }
  if (order.status === "in_progress") {
    return { label: "Em andamento", tone: "text-amber-700 bg-amber-100" };
  }
  return { label: "No prazo", tone: "text-marinha-700 bg-marinha-100" };
}

const STATUS_LABEL: Record<ServiceOrderStatus, string> = {
  draft: "Triagem",
  scheduled: "Agendada",
  in_progress: "Em campo",
  completed: "Concluída",
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
  medium: "Média",
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
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setError(res.error ?? "Erro ao carregar ordens de serviço.");
      }

      setIsLoading(false);
    },
    [skip],
  );

  useEffect(() => {
    if (noBusinessId) {
      setOrders([]);
      setHasMore(false);
      setSkip(0);
      return;
    }

    void load(true);
  }, [load, noBusinessId]);

  async function patchStatus(id: string, status: ServiceOrderStatus) {
    const res = await erpFetch<ServiceOrder>(`/api/v1/erp/service-orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });

    if (!res.ok || !res.data) {
      setError(res.error ?? "Não foi possível atualizar a ordem de serviço.");
      return;
    }

    setOrders((prev) => prev.map((row) => (row.id === id ? res.data! : row)));
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

  const columns: ErpColumn<ServiceOrder>[] = [
    {
      key: "title",
      label: "OS",
      render: (row) => (
        <div>
          <Link
            href={`/erp/ordens-servico/${row.id}`}
            className="font-semibold text-marinha-900 transition hover:text-marinha-700 hover:underline"
          >
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
          <div className="text-xs text-marinha-500">Prazo: {fmtDate(row.promisedFor)}</div>
        </div>
      ),
    },
    {
      key: "where",
      label: "Situação",
      render: (row) => (
        <div className="text-sm text-marinha-700">
          <div>{getLifecycleStage(row)}</div>
          <div className="text-xs text-marinha-500">{row.serviceLocation ?? "Local não informado"}</div>
          <div className="text-xs text-marinha-500">Etapa há {fmtDurationSince(getStageStartedAt(row))}</div>
        </div>
      ),
    },
    {
      key: "assigned",
      label: "Responsável",
      render: (row) => (
        <div className="text-sm text-marinha-700">
          <div>{getCurrentOwner(row)}</div>
          <div className="text-xs text-marinha-500">
            {row.status === "in_progress"
              ? `Início: ${row.startedByUser?.fullName ?? "-"}`
              : `Designada para: ${row.assignedUser?.fullName ?? row.assignedTo ?? "-"}`}
          </div>
        </div>
      ),
    },
    {
      key: "lifecycle",
      label: "Histórico",
      render: (row) => (
        <div className="space-y-1 text-xs text-marinha-600">
          <div>Aberta por: <strong>{row.createdByUser?.fullName ?? "-"}</strong></div>
          <div>Aberta há: <strong>{fmtDurationSince(row.createdAt)}</strong></div>
          <div>Início: <strong>{fmtDateTime(row.startedAt)}</strong></div>
          {row.completedAt ? <div>Conclusão: <strong>{fmtDateTime(row.completedAt)}</strong></div> : null}
          {row.cancelledAt ? <div>Cancelamento: <strong>{fmtDateTime(row.cancelledAt)}</strong></div> : null}
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
        title="Ordens de serviço"
        description="Acompanhe abertura, agenda, execução e conclusão das ordens de serviço."
        badge="Serviços"
      >
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/erp/ordens-servico/nova">
            <Button variant="primary" disabled={noBusinessId}>
              Nova OS
            </Button>
          </Link>
        </div>
      </PageIntro>

      <div className="mb-6 grid gap-4 md:grid-cols-5">
        <Card variant="compact">
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Abertas</p>
          <p className="mt-2 text-2xl font-bold text-marinha-900">{activeOrders.length}</p>
        </Card>
        <Card variant="compact">
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Em andamento</p>
          <p className="mt-2 text-2xl font-bold text-marinha-900">{inProgressOrders.length}</p>
        </Card>
        <Card variant="compact">
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Atrasadas</p>
          <p className="mt-2 text-2xl font-bold text-marinha-900">{overdueOrders.length}</p>
        </Card>
        <Card variant="compact">
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Sem responsável</p>
          <p className="mt-2 text-2xl font-bold text-marinha-900">{unassignedActiveOrders.length}</p>
        </Card>
        <Card variant="compact">
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Receita concluída</p>
          <p className="mt-2 text-lg font-bold text-marinha-900">{fmtMoney(String(completedAmount))}</p>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_320px]">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-lg font-bold text-marinha-900">Ordens prioritárias</h2>
              <p className="mt-1 text-sm text-marinha-500">Ordens com maior urgência operacional.</p>
            </div>
            <Link href="/erp/ordens-servico/nova">
              <Button variant="primary" disabled={noBusinessId}>
                Nova OS
              </Button>
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {managerRadarOrders.length ? (
              managerRadarOrders.map((order) => {
                const health = getOperationalHealth(order);
                return (
                  <div key={order.id} className="rounded-2xl border border-marinha-900/10 bg-slate-50/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/erp/ordens-servico/${order.id}`}
                          className="font-semibold text-marinha-900 transition hover:text-marinha-700 hover:underline"
                        >
                          {order.title}
                        </Link>
                        <p className="mt-1 text-sm text-marinha-500">
                          {order.party?.name ?? order.contactName ?? "Cliente não informado"} • {getLifecycleStage(order)}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${health.tone}`}>{health.label}</span>
                    </div>

                    <div className="mt-3 grid gap-3 text-sm text-marinha-600 md:grid-cols-4">
                      <p>Responsável: <strong>{getCurrentOwner(order)}</strong></p>
                      <p>Aberta há: <strong>{fmtDurationSince(order.createdAt)}</strong></p>
                      <p>Local: <strong>{order.serviceLocation ?? "Não informado"}</strong></p>
                      <p>Prazo: <strong>{fmtDate(order.promisedFor)}</strong></p>
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
        </Card>

        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Resumo</p>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl bg-slate-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Mais antiga aberta</p>
              <p className="mt-1 text-lg font-bold text-marinha-900">
                {oldestOpenOrder ? fmtDurationSince(oldestOpenOrder.createdAt) : "-"}
              </p>
              <p className="mt-1 text-sm text-marinha-500">{oldestOpenOrder?.title ?? "Nenhuma ordem aberta"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Agendadas</p>
              <p className="mt-1 text-lg font-bold text-marinha-900">{scheduledOrders.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Concluídas</p>
              <p className="mt-1 text-lg font-bold text-marinha-900">{completedOrders.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg font-bold text-marinha-900">Lista de ordens</h2>
            <p className="mt-1 text-sm text-marinha-500">Acompanhe status, responsável, prazo e atendimento.</p>
          </div>
        </div>

        <ErpDataTable
          columns={columns}
          data={orders}
          isLoading={isLoading}
          error={error}
          emptyMessage="Nenhuma ordem de serviço cadastrada."
          onRetry={() => load(true)}
          onLoadMore={() => load(false)}
          hasMore={hasMore}
          keyExtractor={(row) => row.id}
        />
      </Card>
    </>
  );
}


