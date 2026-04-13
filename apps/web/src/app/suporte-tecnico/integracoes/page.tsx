"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type TestResult = {
  ok: boolean;
  integrationKey: "plugnotas" | "whatsapp";
  status: SupportIntegration["status"];
  message: string;
  checkedAt: string;
  details?: string[];
};

function toneForStatus(status: SupportIntegration["status"]): "accent" | "warning" | "danger" | "neutral" | "success" {
  if (status === "healthy") return "success";
  if (status === "warning") return "warning";
  if (status === "error") return "danger";
  if (status === "not_configured") return "neutral";
  return "accent";
}

export default function SupportIntegrationsPage() {
  const [integrations, setIntegrations] = useState<SupportIntegration[]>([]);
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await supportFetch<SupportIntegration[]>("/api/v1/support/integrations");
      if (!res.ok || !res.data) {
        setError(res.error ?? "Não foi possível carregar as integrações.");
        return;
      }
      setIntegrations(res.data);
    }
    void load();
  }, []);

  async function testIntegration(key: string) {
    setTestingKey(key);
    const res = await supportFetch<TestResult>(`/api/v1/support/integrations/${key}/test`, {
      method: "POST",
    });
    setTestingKey(null);
    if (!res.ok || !res.data) {
      setMessages((prev) => ({ ...prev, [key]: res.error ?? "Falha no teste." }));
      return;
    }
    const result = res.data;
    setMessages((prev) => ({
      ...prev,
      [key]: `${result.message} · ${new Date(result.checkedAt).toLocaleString("pt-BR")}`,
    }));
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
          Integrações
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Monitoramento e testes</h1>
      </div>

      {error ? <Card><p className="text-sm text-red-700">{error}</p></Card> : null}

      <div className="grid gap-4">
        {integrations.map((integration) => (
          <Card
            key={integration.integrationKey}
            className="rounded-[24px] border border-white/10 bg-slate-900/80 p-6 text-slate-100"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-semibold">{integration.label}</h2>
                  <Badge tone={toneForStatus(integration.status)}>{integration.status}</Badge>
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    {integration.environment}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">{integration.summary}</p>
                <div className="mt-4 grid gap-2">
                  {integration.details.map((detail) => (
                    <div key={detail} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                      {detail}
                    </div>
                  ))}
                </div>
                {messages[integration.integrationKey] ? (
                  <p className="mt-4 text-sm text-teal-300">{messages[integration.integrationKey]}</p>
                ) : null}
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                {integration.actions.map((action) => (
                  <Button
                    key={action.key}
                    variant="secondary"
                    onClick={() => void testIntegration(integration.integrationKey)}
                    disabled={testingKey === integration.integrationKey}
                  >
                    {testingKey === integration.integrationKey ? "Testando..." : action.label}
                  </Button>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
