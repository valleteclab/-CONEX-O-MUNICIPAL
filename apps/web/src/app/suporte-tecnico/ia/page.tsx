"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supportFetch } from "@/lib/api-browser";

type AiSettings = {
  provider: "openrouter";
  model: string;
  temperature: number;
  maxItemsPerJob: number;
};

export default function SupportAiPage() {
  const [form, setForm] = useState<AiSettings>({
    provider: "openrouter",
    model: "",
    temperature: 0.2,
    maxItemsPerJob: 50,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await supportFetch<AiSettings>("/api/v1/support/ai-settings");
      setLoading(false);
      if (!res.ok || !res.data) {
        setMessage(res.error ?? "Não foi possível carregar a configuração da IA.");
        return;
      }
      setForm(res.data);
    }
    void load();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await supportFetch<AiSettings>("/api/v1/support/ai-settings", {
      method: "PATCH",
      body: JSON.stringify({
        model: form.model,
        temperature: Number(form.temperature),
        maxItemsPerJob: Number(form.maxItemsPerJob),
      }),
    });
    setSaving(false);
    if (!res.ok || !res.data) {
      setMessage(res.error ?? "Não foi possível salvar a configuração.");
      return;
    }
    setForm(res.data);
    setMessage("Configuração operacional da IA atualizada.");
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
          IA operacional
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Modelo e parâmetros ativos</h1>
      </div>

      <Card className="rounded-[24px] border border-white/10 bg-slate-900/80 p-6 text-slate-100">
        {loading ? (
          <p className="text-sm text-slate-300">Carregando configuração…</p>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            {message ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                {message}
              </div>
            ) : null}

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Provider</label>
                <Input value={form.provider} disabled />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Modelo</label>
                <Input
                  value={form.model}
                  onChange={(event) => setForm((prev) => ({ ...prev, model: event.target.value }))}
                  placeholder="openai/gpt-4o-mini"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Temperatura</label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.temperature}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, temperature: Number(event.target.value) }))
                  }
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Máx. itens por job</label>
                <Input
                  type="number"
                  value={form.maxItemsPerJob}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, maxItemsPerJob: Number(event.target.value) }))
                  }
                />
              </div>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar configuração"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
