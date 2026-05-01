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

type OpenRouterModel = {
  id: string;
  name: string;
  contextLength: number | null;
  promptPrice: string | null;
  completionPrice: string | null;
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
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [settingsRes, modelsRes] = await Promise.all([
        supportFetch<AiSettings>("/api/v1/support/ai-settings"),
        supportFetch<OpenRouterModel[]>("/api/v1/support/ai-models"),
      ]);
      setLoading(false);
      setModelsLoading(false);
      if (!settingsRes.ok || !settingsRes.data) {
        setMessage(settingsRes.error ?? "Não foi possível carregar a configuração da IA.");
        return;
      }
      setForm(settingsRes.data);
      if (modelsRes.ok && modelsRes.data) {
        setModels(modelsRes.data);
      }
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
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-marinha-500">
          IA operacional
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-marinha-900">Configurações da IA</h1>
      </div>

      <Card className="rounded-[24px] border border-marinha-900/8 bg-white/92 p-6 text-marinha-900">
        {loading ? (
          <p className="text-sm text-marinha-600">Carregando configuração…</p>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            {message ? (
              <div className="rounded-2xl border border-marinha-900/8 bg-surface px-4 py-3 text-sm text-marinha-700">
                {message}
              </div>
            ) : null}

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-marinha-800">Fornecedor da IA</label>
                <Input value={form.provider} disabled />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-marinha-800">Modelo</label>
                <Input
                  list="openrouter-models"
                  value={form.model}
                  onChange={(event) => setForm((prev) => ({ ...prev, model: event.target.value }))}
                  placeholder="openai/gpt-4o-mini"
                />
                <datalist id="openrouter-models">
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </datalist>
                <p className="mt-2 text-xs text-marinha-500">
                  {modelsLoading
                    ? "Consultando catálogo do OpenRouter..."
                    : `${models.length} modelos disponíveis para seleção.`}
                </p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-marinha-800">Criatividade da resposta</label>
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
                <label className="mb-2 block text-sm font-medium text-marinha-800">Limite de itens por análise</label>
                <Input
                  type="number"
                  value={form.maxItemsPerJob}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, maxItemsPerJob: Number(event.target.value) }))
                  }
                />
              </div>
            </div>

            {models.length > 0 ? (
              <div className="rounded-[20px] border border-marinha-900/8 bg-surface p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-marinha-500">
                  Sugestões do catálogo OpenRouter
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {models.slice(0, 8).map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, model: model.id }))}
                      className="rounded-2xl border border-marinha-900/8 bg-white px-4 py-3 text-left transition hover:border-municipal-600/30 hover:bg-municipal-600/6"
                    >
                      <p className="text-sm font-semibold text-marinha-900">{model.id}</p>
                      <p className="mt-1 text-xs text-marinha-500">
                        {model.contextLength
                          ? `${model.contextLength.toLocaleString("pt-BR")} tokens`
                          : "contexto não informado"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar configuração"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
