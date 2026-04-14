"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageIntro } from "@/components/layout/page-intro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSelectedBusinessId } from "@/hooks/use-selected-business-id";
import { erpFetch } from "@/lib/api-browser";

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

type ServiceOrderItem = {
  id: string;
  qty: string;
  unitPrice: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    kind?: "product" | "service";
  } | null;
};

type ServiceOrder = {
  id: string;
  title: string;
  status: ServiceOrderStatus;
  priority: "low" | "medium" | "high" | "urgent";
  serviceCategory: string | null;
  totalAmount: string;
  description: string | null;
  note: string | null;
  scheduledFor: string | null;
  promisedFor: string | null;
  serviceLocation: string | null;
  serviceAddress: ServiceAddress;
  contactName: string | null;
  contactPhone: string | null;
  diagnosis: string | null;
  resolution: string | null;
  checklist: string[];
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  party?: { name: string } | null;
  assignedUser?: { id: string; fullName: string } | null;
  createdByUser?: { id: string; fullName: string } | null;
  startedByUser?: { id: string; fullName: string } | null;
  completedByUser?: { id: string; fullName: string } | null;
  cancelledByUser?: { id: string; fullName: string } | null;
  items: ServiceOrderItem[];
};

const STATUS_LABEL: Record<ServiceOrderStatus, string> = {
  draft: "Triagem",
  scheduled: "Agendada",
  in_progress: "Em campo",
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

const PRIORITY_LABEL: Record<ServiceOrder["priority"], string> = {
  low: "Baixa",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

function fmtMoney(v: string) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

function fullAddress(address?: ServiceAddress | null) {
  if (!address) return "-";
  return (
    [address.street, address.number, address.neighborhood, address.city, address.state, address.zipCode]
      .filter(Boolean)
      .join(", ") || "-"
  );
}

function currentOwner(order: ServiceOrder) {
  return order.assignedUser?.fullName ?? order.startedByUser?.fullName ?? "-";
}

function healthLabel(order: ServiceOrder) {
  if (order.status === "completed") return { text: "Servico encerrado", tone: "bg-green-100 text-green-700" };
  if (order.status === "cancelled") return { text: "Cancelada", tone: "bg-red-100 text-red-700" };
  if (order.promisedFor && new Date(order.promisedFor).getTime() < Date.now()) {
    return { text: "Prazo vencido", tone: "bg-red-100 text-red-700" };
  }
  if (order.status === "in_progress") return { text: "Equipe em campo", tone: "bg-amber-100 text-amber-700" };
  if (!order.assignedUser) return { text: "Sem dono definido", tone: "bg-amber-100 text-amber-700" };
  return { text: "Dentro do prazo", tone: "bg-marinha-100 text-marinha-700" };
}

function SectionBadge({ index, label }: { index: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-marinha-900 text-sm font-semibold text-white">
        {index}
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-marinha-500">{label}</p>
    </div>
  );
}

export default function ErpServiceOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const businessId = useSelectedBusinessId();
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!businessId) {
      setOrder(null);
      setIsLoading(false);
      setError("Selecione um negocio para visualizar a OS.");
      return;
    }

    let active = true;

    async function load() {
      setIsLoading(true);
      setError(null);
      const res = await erpFetch<ServiceOrder>(`/api/v1/erp/service-orders/${params.id}`);
      if (!active) return;

      if (res.ok && res.data) {
        setOrder(res.data);
      } else {
        setError(res.error ?? "Nao foi possivel carregar a ordem de servico.");
      }

      setIsLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [businessId, params.id]);

  async function patchStatus(status: ServiceOrderStatus) {
    setIsUpdating(true);
    const res = await erpFetch<ServiceOrder>(`/api/v1/erp/service-orders/${params.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setIsUpdating(false);

    if (res.ok && res.data) {
      setOrder(res.data);
      setError(null);
      return;
    }

    setError(res.error ?? "Nao foi possivel atualizar a OS.");
  }

  const timeline = useMemo(() => {
    if (!order) return [];

    const items = [
      {
        key: "created",
        label: "OS aberta",
        at: order.createdAt,
        by: order.createdByUser?.fullName ?? "-",
        detail: "Cadastro da ordem de servico.",
      },
      order.scheduledFor
        ? {
            key: "scheduled",
            label: "Atendimento agendado",
            at: order.scheduledFor,
            by: order.assignedUser?.fullName ?? "-",
            detail: "Data de atendimento definida.",
          }
        : null,
      order.startedAt
        ? {
            key: "started",
            label: "Atendimento iniciado",
            at: order.startedAt,
            by: order.startedByUser?.fullName ?? "-",
            detail: "Ordem em andamento.",
          }
        : null,
      order.completedAt
        ? {
            key: "completed",
            label: "Atendimento concluido",
            at: order.completedAt,
            by: order.completedByUser?.fullName ?? "-",
            detail: "Ordem finalizada.",
          }
        : null,
      order.cancelledAt
        ? {
            key: "cancelled",
            label: "OS cancelada",
            at: order.cancelledAt,
            by: order.cancelledByUser?.fullName ?? "-",
            detail: order.cancellationReason ?? "Ordem encerrada sem conclusao.",
          }
        : null,
    ].filter(Boolean);

    return items as { key: string; label: string; at: string; by: string; detail: string }[];
  }, [order]);

  if (isLoading) {
    return (
      <>
        <PageIntro title="Detalhe da OS" description="Carregando ordem de servico." badge="Servicos" />
        <Card>
          <div className="space-y-4">
            <div className="h-7 w-64 animate-pulse rounded bg-marinha-900/10" />
            <div className="h-28 animate-pulse rounded-3xl bg-marinha-900/5" />
            <div className="h-72 animate-pulse rounded-3xl bg-marinha-900/5" />
          </div>
        </Card>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <PageIntro title="Detalhe da OS" description="Nao foi possivel carregar a ordem de servico." badge="Servicos" />
        <Card>
          <div className="space-y-4">
            <p className="text-sm text-red-600">{error ?? "OS nao encontrada."}</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/erp/ordens-servico">
                <Button variant="ghost">Voltar para a lista</Button>
              </Link>
            </div>
          </div>
        </Card>
      </>
    );
  }

  const health = healthLabel(order);

  return (
    <>
      <PageIntro
        title={order.title}
        description="Detalhes da ordem de servico."
        badge="Ordem de servico"
      >
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link href="/erp/ordens-servico">
            <Button variant="ghost">Voltar para ordens</Button>
          </Link>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOR[order.status]}`}>
            {STATUS_LABEL[order.status]}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${health.tone}`}>{health.text}</span>
        </div>
      </PageIntro>

      <Card variant="featured" className="mb-6 overflow-hidden">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-marinha-500">Acompanhamento da ordem</p>
            <h2 className="mt-2 font-serif text-3xl font-bold text-marinha-900">Visao completa da OS</h2>
            <p className="mt-2 max-w-2xl text-sm text-marinha-600">
              Status, atendimento, itens e historico reunidos em uma tela propria para consulta e acompanhamento.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <div className="rounded-3xl bg-white/75 p-4">
                <SectionBadge index="1" label="Situacao" />
              </div>
              <div className="rounded-3xl bg-white/75 p-4">
                <SectionBadge index="2" label="Timeline" />
              </div>
              <div className="rounded-3xl bg-white/75 p-4">
                <SectionBadge index="3" label="Tecnico" />
              </div>
              <div className="rounded-3xl bg-white/75 p-4">
                <SectionBadge index="4" label="Itens" />
              </div>
            </div>
          </div>

          <div className="rounded-[28px] bg-marinha-950 p-5 text-white shadow-xl shadow-marinha-950/10">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Resumo rapido</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-white/8 p-4">
                <p className="text-xs uppercase tracking-wide text-white/60">Status atual</p>
                <p className="mt-1 text-2xl font-bold">{STATUS_LABEL[order.status]}</p>
                <p className="mt-2 text-sm text-white/75">{health.text}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-white/60">Responsavel</p>
                  <p className="mt-1 text-sm font-semibold">{currentOwner(order)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-white/60">Tempo aberto</p>
                  <p className="mt-1 text-sm font-semibold">{fmtDurationSince(order.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
        <div className="space-y-6">
          <Card variant="featured">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <SectionBadge index="1" label="Situacao" />
                <h2 className="mt-2 font-serif text-2xl font-bold text-marinha-900">Situacao atual</h2>
              </div>
              <Badge tone="accent">{PRIORITY_LABEL[order.priority]}</Badge>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl bg-white/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Responsavel atual</p>
                <p className="mt-2 text-xl font-semibold text-marinha-900">{currentOwner(order)}</p>
              </div>
              <div className="rounded-3xl bg-white/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Tempo aberto</p>
                <p className="mt-2 text-xl font-semibold text-marinha-900">{fmtDurationSince(order.createdAt)}</p>
              </div>
              <div className="rounded-3xl bg-white/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Cliente</p>
                <p className="mt-2 text-lg font-semibold text-marinha-900">{order.party?.name ?? order.contactName ?? "-"}</p>
                <p className="mt-1 text-sm text-marinha-500">{order.contactPhone ?? "Sem telefone informado"}</p>
              </div>
              <div className="rounded-3xl bg-white/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Local da execucao</p>
                <p className="mt-2 text-lg font-semibold text-marinha-900">{order.serviceLocation ?? "-"}</p>
                <p className="mt-1 text-sm text-marinha-500">{fullAddress(order.serviceAddress)}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {order.status === "draft" ? (
                <>
                  <Button variant="primary" onClick={() => patchStatus("scheduled")} disabled={isUpdating}>Agendar</Button>
                  <Button variant="ghost" onClick={() => patchStatus("cancelled")} disabled={isUpdating}>Cancelar</Button>
                </>
              ) : null}
              {order.status === "scheduled" ? (
                <>
                  <Button variant="primary" onClick={() => patchStatus("in_progress")} disabled={isUpdating}>Iniciar atendimento</Button>
                  <Button variant="ghost" onClick={() => patchStatus("completed")} disabled={isUpdating}>Concluir direto</Button>
                </>
              ) : null}
              {order.status === "in_progress" ? (
                <Button variant="primary" onClick={() => patchStatus("completed")} disabled={isUpdating}>Concluir atendimento</Button>
              ) : null}
            </div>
          </Card>

          <Card>
            <div className="mb-4">
              <SectionBadge index="2" label="Timeline" />
              <h2 className="font-serif text-xl font-bold text-marinha-900">Timeline da OS</h2>
            </div>

            <div className="space-y-4">
              {timeline.map((entry, index) => (
                <div key={entry.key} className="grid gap-4 rounded-[28px] border border-marinha-900/10 bg-slate-50/70 p-5 md:grid-cols-[40px_minmax(0,1fr)]">
                  <div className="flex flex-col items-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-marinha-900 text-sm font-semibold text-white">
                      {index + 1}
                    </div>
                    {index < timeline.length - 1 ? <div className="mt-2 h-full w-px bg-marinha-900/15" /> : null}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold text-marinha-900">{entry.label}</p>
                      <p className="text-sm text-marinha-500">{fmtDateTime(entry.at)}</p>
                    </div>
                    <p className="mt-2 text-sm text-marinha-600">Por <strong>{entry.by}</strong></p>
                    <p className="mt-1 text-sm text-marinha-500">{entry.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="mb-4">
              <SectionBadge index="3" label="Tecnico" />
              <h2 className="font-serif text-xl font-bold text-marinha-900">Informacoes tecnicas</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-marinha-900/10 bg-slate-50/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Diagnostico</p>
                <p className="mt-2 text-sm text-marinha-700">{order.diagnosis || "Nao informado."}</p>
              </div>
              <div className="rounded-3xl border border-marinha-900/10 bg-slate-50/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Solucao aplicada</p>
                <p className="mt-2 text-sm text-marinha-700">{order.resolution || "Nao informada."}</p>
              </div>
              <div className="rounded-3xl border border-marinha-900/10 bg-slate-50/70 p-5 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Checklist operacional</p>
                {order.checklist.length ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {order.checklist.map((item, index) => (
                      <div key={`${item}-${index}`} className="rounded-2xl border border-marinha-900/10 bg-white px-4 py-3 text-sm text-marinha-700">
                        {item}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-marinha-500">Sem checklist registrado.</p>
                )}
              </div>
              <div className="rounded-3xl border border-marinha-900/10 bg-slate-50/70 p-5 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Observacoes operacionais</p>
                <p className="mt-2 text-sm text-marinha-700">{order.note || "Sem observacoes adicionais."}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="mb-4">
              <SectionBadge index="4" label="Itens" />
              <h2 className="font-serif text-xl font-bold text-marinha-900">Materiais e servicos</h2>
            </div>

            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="grid gap-3 rounded-3xl border border-marinha-900/10 bg-slate-50/70 p-4 md:grid-cols-[minmax(0,1.4fr)_120px_140px_140px] md:items-center">
                  <div>
                    <p className="font-semibold text-marinha-900">{item.product?.name ?? "Item removido"}</p>
                    <p className="mt-1 text-sm text-marinha-500">{item.product?.sku ?? "-"} {item.product?.kind === "service" ? "• servico" : "• material"}</p>
                  </div>
                  <div className="text-sm text-marinha-700">
                    <p className="text-xs uppercase tracking-wide text-marinha-500">Qtd</p>
                    <p className="mt-1 font-semibold">{item.qty}</p>
                  </div>
                  <div className="text-sm text-marinha-700">
                    <p className="text-xs uppercase tracking-wide text-marinha-500">Unitario</p>
                    <p className="mt-1 font-semibold">{fmtMoney(item.unitPrice)}</p>
                  </div>
                  <div className="text-sm text-marinha-700">
                    <p className="text-xs uppercase tracking-wide text-marinha-500">Subtotal</p>
                    <p className="mt-1 font-semibold">{fmtMoney(String(Number(item.qty) * Number(item.unitPrice)))}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[28px]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-marinha-500">Resumo financeiro e prazos</p>
            <div className="mt-4 space-y-4">
              <div className="rounded-3xl bg-marinha-950 p-5 text-white">
                <p className="text-xs uppercase tracking-wide text-white/60">Valor total</p>
                <p className="mt-2 text-3xl font-bold">{fmtMoney(order.totalAmount)}</p>
              </div>
              <div className="rounded-3xl border border-marinha-900/10 bg-slate-50/70 p-5">
                <p className="text-xs uppercase tracking-wide text-marinha-500">Abertura</p>
                <p className="mt-2 text-sm font-semibold text-marinha-900">{fmtDateTime(order.createdAt)}</p>
                <p className="mt-1 text-sm text-marinha-500">Por {order.createdByUser?.fullName ?? "-"}</p>
              </div>
              <div className="rounded-3xl border border-marinha-900/10 bg-slate-50/70 p-5">
                <p className="text-xs uppercase tracking-wide text-marinha-500">Promessa</p>
                <p className="mt-2 text-sm font-semibold text-marinha-900">{fmtDateTime(order.promisedFor)}</p>
                <p className="mt-1 text-sm text-marinha-500">Agendamento: {fmtDateTime(order.scheduledFor)}</p>
              </div>
              <div className="rounded-3xl border border-marinha-900/10 bg-slate-50/70 p-5">
                <p className="text-xs uppercase tracking-wide text-marinha-500">Local</p>
                <p className="mt-2 text-sm font-semibold text-marinha-900">{order.serviceLocation || "Nao informado"}</p>
                <p className="mt-1 text-sm text-marinha-500">{fullAddress(order.serviceAddress)}</p>
              </div>
              <div className="rounded-3xl border border-marinha-900/10 bg-slate-50/70 p-5">
                <p className="text-xs uppercase tracking-wide text-marinha-500">Descricao da OS</p>
                <p className="mt-2 text-sm text-marinha-700">{order.description || "Sem descricao informada."}</p>
              </div>
              {error ? (
                <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
