"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { apiAuthFetch } from "@/lib/api-browser";
import { getAccessToken } from "@/lib/auth-storage";
import type { DirectoryListingDto } from "@/types/directory";

type FormState = {
  slug: string;
  tradeName: string;
  description: string;
  category: string;
  modo: "perfil" | "loja";
  isPublished: boolean;
};

function toFormState(row?: DirectoryListingDto): FormState {
  return {
    slug: row?.slug ?? "",
    tradeName: row?.tradeName ?? "",
    description: row?.description ?? "",
    category: row?.category ?? "",
    modo: row?.modo ?? "perfil",
    isPublished: row?.isPublished ?? true,
  };
}

export function DirectoryManageForm({ initialItems }: { initialItems: DirectoryListingDto[] }) {
  const [items, setItems] = useState(initialItems);
  const [selectedId, setSelectedId] = useState<string | null>(initialItems[0]?.id ?? null);
  const [form, setForm] = useState<FormState>(toFormState(initialItems[0]));
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      return;
    }
    apiAuthFetch<DirectoryListingDto[]>("/api/v1/businesses/mine/list").then((res) => {
      if (!res.ok || !res.data) {
        return;
      }
      setItems(res.data);
      if (!selectedId && res.data[0]) {
        setSelectedId(res.data[0].id);
        setForm(toFormState(res.data[0]));
      }
    });
  }, [selectedId]);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  function selectItem(id: string | null) {
    setSelectedId(id);
    setForm(toFormState(items.find((item) => item.id === id)));
    setError(null);
    setOk(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    if (!getAccessToken()) {
      setError("Faça login para gerenciar sua vitrine.");
      return;
    }
    setLoading(true);
    const payload = {
      slug: form.slug,
      tradeName: form.tradeName,
      description: form.description.trim() || undefined,
      category: form.category.trim() || undefined,
      modo: form.modo,
      isPublished: form.isPublished,
    };
    const res = selectedItem
      ? await apiAuthFetch<DirectoryListingDto>(`/api/v1/businesses/${selectedItem.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
      : await apiAuthFetch<DirectoryListingDto>("/api/v1/businesses", {
          method: "POST",
          body: JSON.stringify(payload),
        });
    setLoading(false);
    if (!res.ok || !res.data) {
      setError(res.error || "Não foi possível salvar a vitrine.");
      return;
    }
    const nextItems = selectedItem
      ? items.map((item) => (item.id === res.data?.id ? res.data : item))
      : [res.data, ...items];
    setItems(nextItems);
    setSelectedId(res.data.id);
    setForm(toFormState(res.data));
    setOk(selectedItem ? "Vitrine atualizada com sucesso." : "Vitrine criada com sucesso.");
  }

  if (!getAccessToken()) {
    return (
      <Card>
        <p className="text-sm text-marinha-600">
          Para gerenciar sua vitrine, <Link href="/login" className="font-semibold text-municipal-700 hover:underline">entre na sua conta</Link>.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-lg text-marinha-900">Minhas vitrines</h2>
          <Button variant="secondary" onClick={() => selectItem(null)}>
            Nova
          </Button>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-marinha-500">Você ainda não publicou nenhuma vitrine.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => selectItem(item.id)}
                  className={`w-full rounded-btn border px-3 py-3 text-left transition ${selectedId === item.id ? "border-municipal-600 bg-municipal-600/5" : "border-marinha-900/10 bg-white hover:border-municipal-600/30"}`}
                >
                  <p className="font-semibold text-marinha-900">{item.tradeName}</p>
                  <p className="mt-1 text-xs text-marinha-500">/{item.slug} · {item.modo}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="font-serif text-lg text-marinha-900">
          {selectedItem ? "Editar vitrine" : "Criar vitrine"}
        </h2>
        <p className="mt-1 text-sm text-marinha-500">
          Publique um perfil virtual ou uma loja virtual no diretório municipal.
        </p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          {error ? (
            <p className="rounded-btn border border-alerta-500/30 bg-alerta-500/10 px-3 py-2 text-sm text-alerta-600">
              {error}
            </p>
          ) : null}
          {ok ? (
            <p className="rounded-btn border border-sucesso-500/30 bg-sucesso-500/10 px-3 py-2 text-sm text-sucesso-700">
              {ok}
            </p>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="dir-trade-name" className="mb-1 block text-sm font-medium text-marinha-700">
                Nome fantasia
              </label>
              <Input
                id="dir-trade-name"
                required
                value={form.tradeName}
                onChange={(e) => setForm((cur) => ({ ...cur, tradeName: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="dir-slug" className="mb-1 block text-sm font-medium text-marinha-700">
                Slug público
              </label>
              <Input
                id="dir-slug"
                required
                disabled={!!selectedItem}
                value={form.slug}
                onChange={(e) => setForm((cur) => ({ ...cur, slug: e.target.value.toLowerCase() }))}
                placeholder="meu-negocio"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="dir-category" className="mb-1 block text-sm font-medium text-marinha-700">
                Categoria
              </label>
              <Input
                id="dir-category"
                value={form.category}
                onChange={(e) => setForm((cur) => ({ ...cur, category: e.target.value }))}
                placeholder="Ex.: Alimentação"
              />
            </div>
            <div>
              <label htmlFor="dir-modo" className="mb-1 block text-sm font-medium text-marinha-700">
                Tipo de vitrine
              </label>
              <select
                id="dir-modo"
                value={form.modo}
                onChange={(e) => setForm((cur) => ({ ...cur, modo: e.target.value as "perfil" | "loja" }))}
                className="focus-ring min-h-[44px] w-full rounded-btn border-2 border-marinha-900/25 bg-white px-3 py-2 text-sm text-marinha-900"
              >
                <option value="perfil">Perfil virtual</option>
                <option value="loja">Loja virtual</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="dir-description" className="mb-1 block text-sm font-medium text-marinha-700">
              Descrição
            </label>
            <Textarea
              id="dir-description"
              rows={5}
              value={form.description}
              onChange={(e) => setForm((cur) => ({ ...cur, description: e.target.value }))}
              placeholder="Descreva seus produtos, serviços e diferenciais"
            />
          </div>
          {selectedItem ? (
            <label className="flex cursor-pointer gap-3 text-sm text-marinha-700">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => setForm((cur) => ({ ...cur, isPublished: e.target.checked }))}
                className="focus-ring mt-1 h-4 w-4 rounded border-marinha-900/25 text-municipal-600"
              />
              <span>Vitrine publicada no diretório</span>
            </label>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando…" : selectedItem ? "Salvar alterações" : "Criar vitrine"}
            </Button>
            {selectedItem ? (
              <Link
                href={`/diretorio/${selectedItem.slug}`}
                className="focus-ring inline-flex min-h-[44px] items-center justify-center rounded-btn border-2 border-marinha-900/25 bg-white px-4 py-2.5 text-sm font-semibold text-marinha-900 transition hover:border-municipal-600/40 hover:bg-surface"
              >
                Ver página pública
              </Link>
            ) : null}
          </div>
        </form>
      </Card>
    </div>
  );
}
