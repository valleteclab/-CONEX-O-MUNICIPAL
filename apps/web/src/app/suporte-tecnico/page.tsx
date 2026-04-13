"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { supportFetch } from "@/lib/api-browser";

type SupportIntegration = {
  integrationKey: "plugnotas" | "whatsapp";
  label: string;
  status: "healthy" | "warning" | "error" | "disabled" | "not_configured";
  environment: string;
  summary: string;
  details: string[];
  actions: { key: string; label: string }[];
};

type DashboardPayload = {
  ai: {
    provider: string;
    model: string;
    temperature: number;
    maxItemsPerJob: number;
    usage: string[];
  };
  plugnotas: {
    environment: string;
    baseUrl: string;
    configured: boolean;
    webhookConfigured: boolean;
    errorDocumentsLast7Days: number;
    pendingDocuments: number;
    activeBusinesses: number;
  };
  integrations: SupportIntegration[];
  quickActions: { key: string; label: string; target: string }[];
};

function toneForStatus(status: SupportIntegration["status"]): "accent" | "warning" | "danger" | "neutral" | "success" {
  if (status === "healthy") return "success";
  if (status === "warning") return "warning";
  if (status === "error") return "danger";
  if (status === "not_configured") return "neutral";
  return "accent";
}

export default function SupportDashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await supportFetch<DashboardPayload>("/api/v1/support/dashboard");
      if (!res.ok || !res.data) {
        setError(res.error ?? "Não foi possível carregar o dashboard técnico.");
        return;
      }
      setData(res.data);
    }
    void load();
  }, []);

  if (error) {
    return <Card><p className="text-sm text-red-700">{error}</p></Card>;
  }

  if (!data) {
    return <p className="text-sm text-slate-300">Carregando dashboard técnico…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
        <Card className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,_rgba(20,184,166,0.2),_rgba(15,23,42,0.9))] p-8 text-white">
          <Badge tone="accent">IA em uso</Badge>
          <h2 className="mt-4 text-4xl font-semibold">{data.ai.model}</h2>
          <p className="mt-3 max-w-2xl text-base text-slate-200">
            Provider {data.ai.provider}, temperatura {data.ai.temperature} e limite de{" "}
            {data.ai.maxItemsPerJob} itens por job.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {data.ai.usage.map((usage) => (
              <div key={usage} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100">
                {usage}
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-[28px] border border-white/10 bg-slate-900/80 p-6 text-slate-100">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                PlugNotas
              </p>
              <h2 className="mt-2 text-3xl font-semibold">
                {data.plugnotas.environment === "sandbox" ? "Sandbox" : "Produção"}
              </h2>
            </div>
            <Badge tone={data.plugnotas.configured ? "success" : "warning"}>
              {data.plugnotas.configured ? "Configurado" : "Pendente"}
            </Badge>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Falhas 7 dias</p>
              <p className="mt-2 text-3xl font-semibold">{data.plugnotas.errorDocumentsLast7Days}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Pendências fiscais</p>
              <p className="mt-2 text-3xl font-semibold">{data.plugnotas.pendingDocuments}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Webhook</p>
              <p className="mt-2 text-lg font-semibold">
                {data.plugnotas.webhookConfigured ? "Configurado" : "Não configurado"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Negócios ativos</p>
              <p className="mt-2 text-3xl font-semibold">{data.plugnotas.activeBusinesses}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr,340px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Integrações monitoradas
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-white">Saúde operacional</h2>
            </div>
            <Link href="/suporte-tecnico/integracoes" className="text-sm font-semibold text-teal-300 hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {data.integrations.map((integration) => (
              <Card
                key={integration.integrationKey}
                className="rounded-[24px] border border-white/10 bg-slate-900/80 p-5 text-slate-100"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                      {integration.environment}
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold">{integration.label}</h3>
                  </div>
                  <Badge tone={toneForStatus(integration.status)}>{integration.status}</Badge>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-slate-300">{integration.summary}</p>
              </Card>
            ))}
          </div>
        </div>

        <Card className="rounded-[24px] border border-white/10 bg-slate-900/80 p-5 text-slate-100">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Ações rápidas
          </p>
          <div className="mt-4 space-y-3">
            {data.quickActions.map((action) => (
              <Link
                key={action.key}
                href={action.target}
                className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm font-semibold transition hover:bg-white/10"
              >
                {action.label}
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
