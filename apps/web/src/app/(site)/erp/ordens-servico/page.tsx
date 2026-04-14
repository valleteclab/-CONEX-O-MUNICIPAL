"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ErpDataTable, type ErpColumn } from "@/components/erp/erp-data-table";
import { PageIntro } from "@/components/layout/page-intro";
import { Badge } from "@/components/ui/badge";
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
  if (order.status === "completed") return "Concluida";
  if (order.status === "cancelled") return "Cancelada";
  if (order.status === "in_progress") return "Em andamento";
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
    return { label: "Sem responsavel", tone: "text-amber-700 bg-amber-100" };
  }
  if (order.status === "in_progress") {
    return { label: "Em andamento", tone: "text-amber-700 bg-amber-100" };
  }
  return { label: "No prazo", tone: "text-marinha-700 bg-marinha-100" };
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
        setError(res.error ?? "Erro ao carregar ordens de servico.");
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
      setError(res.error ?? "Nao foi possivel atualizar a ordem de servico.");
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
      label: "Situacao",
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
      label: "Responsavel",
      render: (row) => (
        <div className="text-sm text-marinha-700">
          <div>{getCurrentOwner(row)}</div>
          <div className="text-xs text-marinha-500">
            {row.status === "in_progress"
              ? `Inicio: ${row.startedByUser?.fullName ?? "-"}`
              : `Designada para: ${row.assignedUser?.fullName ?? row.assignedTo ?? "-"}`}
          </div>
        </div>
      ),
    },
    {
      key: "lifecycle",
      label: "Historico",
      render: (row) => (
        <div className="space-y-1 text-xs text-marinha-600">
          <div>Aberta por: <strong>{row.createdByUser?.fullName ?? "-"}</strong></div>
          <div>Aberta ha: <strong>{fmtDurationSince(row.createdAt)}</strong></div>
          <div>Inicio: <strong>{fmtDateTime(row.startedAt)}</strong></div>
          {row.completedAt ? <div>Conclusao: <strong>{fmtDateTime(row.completedAt)}</strong></div> : null}
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
        title="Ordens de servico"
        description="Acompanhe abertura, agenda, execucao e conclusao das ordens de servico."
        badge="Servicos"
      >
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/erp/ordens-servico/nova">
            <Button variant="primary" disabled={noBusinessId}>
              Nova OS
            </Button>
          </Link>
        </div>
      </PageIntro>

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

      <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_360px]">
        <Card className="border border-marinha-900/10 bg-white">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-marinha-900/10 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-marinha-500">Gestao</p>
              <h2 className="mt-2 font-serif text-2xl font-bold text-marinha-900">Painel de acompanhamento</h2>
              <p className="mt-2 max-w-3xl text-sm text-marinha-500">
                Abertura, execucao e acompanhamento da OS ficam separados para deixar a operacao mais clara.
              </p>
            </div>
            <Link href="/erp/ordens-servico/nova">
              <Button variant="primary" disabled={noBusinessId}>
                Abrir nova OS
              </Button>
            </Link>
          </div>

          <div className="grid gap-4 pt-6 md:grid-cols-3">
            <div className="rounded-3xl border border-dashed border-marinha-900/15 bg-slate-50/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Cadastro separado</p>
              <p className="mt-2 text-sm text-marinha-600">Abertura da OS em pagina propria.</p>
            </div>
            <div className="rounded-3xl border border-dashed border-marinha-900/15 bg-slate-50/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Acompanhamento central</p>
              <p className="mt-2 text-sm text-marinha-600">Lista focada em status, prazo e responsavel.</p>
            </div>
            <div className="rounded-3xl border border-dashed border-marinha-900/15 bg-slate-50/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Detalhe completo</p>
              <p className="mt-2 text-sm text-marinha-600">Cada ordem pode ser acompanhada em tela propria.</p>
            </div>
          </div>
        </Card>

        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Indicadores</p>
          <p className="mt-2 text-lg font-bold text-marinha-900">{orders.length} ordens carregadas</p>
          <p className="mt-1 text-sm text-marinha-500">Visao rapida da operacao atual.</p>

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
              <p className="mt-1 text-lg font-bold text-marinha-900">{unassignedActiveOrders.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Atrasadas</p>
              <p className="mt-1 text-lg font-bold text-marinha-900">{overdueOrders.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_380px]">
          <div>
            <div className="mb-4">
              <h2 className="font-serif text-lg font-bold text-marinha-900">Ordens prioritarias</h2>
            </div>

            <div className="mt-5 rounded-3xl border border-marinha-900/10 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-marinha-500">Em destaque</h3>
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
                            <Link
                              href={`/erp/ordens-servico/${order.id}`}
                              className="font-semibold text-marinha-900 transition hover:text-marinha-700 hover:underline"
                            >
                              {order.title}
                            </Link>
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
                          <p>Prazo: <strong>{fmtDateTime(order.promisedFor)}</strong></p>
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
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Resumo</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-white/8 p-4">
                <p className="text-xs uppercase tracking-wide text-white/60">OS mais antiga aberta</p>
                <p className="mt-1 text-xl font-semibold">
                  {oldestOpenOrder ? fmtDurationSince(oldestOpenOrder.createdAt) : "-"}
                </p>
                <p className="mt-2 text-sm text-white/75">{oldestOpenOrder?.title ?? "Nenhuma ordem aberta"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-white/60">Em andamento</p>
                <p className="mt-1 text-xl font-semibold">{inProgressOrders.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-white/60">Atrasadas</p>
                <p className="mt-1 text-xl font-semibold">{overdueOrders.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-white/60">Sem responsavel</p>
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
