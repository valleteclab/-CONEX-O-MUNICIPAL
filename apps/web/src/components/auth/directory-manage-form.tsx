"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { apiAuthFetch } from "@/lib/api-browser";
import { getAccessToken } from "@/lib/auth-storage";
import type { DirectoryListingDto } from "@/types/directory";

type OfferingForm = {
  title: string;
  kind: "product" | "service";
  price: string;
  description: string;
};

type FormState = {
  slug: string;
  tradeName: string;
  publicHeadline: string;
  description: string;
  category: string;
  modo: "perfil" | "loja";
  whatsapp: string;
  phone: string;
  email: string;
  website: string;
  instagram: string;
  servicesText: string;
  offerings: OfferingForm[];
  isPublished: boolean;
};

const emptyOffering = (): OfferingForm => ({
  title: "",
  kind: "product",
  price: "",
  description: "",
});

function toFormState(row?: DirectoryListingDto): FormState {
  return {
    slug: row?.slug ?? "",
    tradeName: row?.tradeName ?? "",
    publicHeadline: row?.publicHeadline ?? "",
    description: row?.description ?? "",
    category: row?.category ?? "",
    modo: row?.modo ?? "perfil",
    whatsapp: row?.contactInfo?.whatsapp ?? "",
    phone: row?.contactInfo?.phone ?? "",
    email: row?.contactInfo?.email ?? "",
    website: row?.contactInfo?.website ?? "",
    instagram: row?.contactInfo?.instagram ?? "",
    servicesText: row?.services?.join("\n") ?? "",
    offerings: row?.offerings?.length
      ? row.offerings.map((off) => ({
          title: off.title,
          kind: off.kind,
          price: off.price ?? "",
          description: off.description ?? "",
        }))
      : [emptyOffering()],
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

  function updateOffering(index: number, key: keyof OfferingForm, value: string) {
    setForm((cur) => ({
      ...cur,
      offerings: cur.offerings.map((off, currentIndex) =>
        currentIndex === index ? { ...off, [key]: value } : off,
      ),
    }));
  }

  function addOffering() {
    setForm((cur) => ({ ...cur, offerings: [...cur.offerings, emptyOffering()] }));
  }

  function removeOffering(index: number) {
    setForm((cur) => ({
      ...cur,
      offerings:
        cur.offerings.length === 1
          ? [emptyOffering()]
          : cur.offerings.filter((_, currentIndex) => currentIndex !== index),
    }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    if (!getAccessToken()) {
      setError("Faça login para gerenciar sua presença digital.");
      return;
    }
    setLoading(true);
    const payload = {
      slug: form.slug,
      tradeName: form.tradeName,
      publicHeadline: form.publicHeadline.trim() || undefined,
      description: form.description.trim() || undefined,
      category: form.category.trim() || undefined,
      modo: form.modo,
      contactInfo: {
        whatsapp: form.whatsapp.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        website: form.website.trim() || undefined,
        instagram: form.instagram.trim() || undefined,
      },
      services: form.servicesText
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      offerings: form.offerings
        .filter((off) => off.title.trim())
        .map((off) => ({
          title: off.title.trim(),
          kind: off.kind,
          price: off.price.trim() || undefined,
          description: off.description.trim() || undefined,
        })),
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
      setError(res.error || "Não foi possível salvar a presença digital.");
      return;
    }
    const nextItems = selectedItem
      ? items.map((item) => (item.id === res.data?.id ? res.data : item))
      : [res.data, ...items];
    setItems(nextItems);
    setSelectedId(res.data.id);
    setForm(toFormState(res.data));
    setOk(selectedItem ? "Perfil atualizado com sucesso." : "Perfil criado com sucesso.");
  }

  if (!getAccessToken()) {
    return (
      <Card>
        <p className="text-sm text-marinha-600">
          Para gerenciar sua presença digital,{" "}
          <Link href="/entrar?intent=portal" className="font-semibold text-municipal-700 hover:underline">
            entre na sua conta
          </Link>
          .
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-lg text-marinha-900">Meus perfis públicos</h2>
          <Button variant="secondary" onClick={() => selectItem(null)}>
            Novo
          </Button>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-marinha-500">Você ainda não publicou nenhum perfil.</p>
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
                  {item.publicHeadline ? <p className="mt-2 text-xs text-marinha-600">{item.publicHeadline}</p> : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="font-serif text-lg text-marinha-900">
          {selectedItem ? "Editar presença digital" : "Criar presença digital"}
        </h2>
        <p className="mt-1 text-sm text-marinha-500">
          Monte o perfil público do negócio com contatos, serviços e um catálogo inicial para diretório e marketplace.
        </p>
        <form className="mt-6 space-y-5" onSubmit={onSubmit}>
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
                onChange={(e) =>
                  setForm((cur) => ({
                    ...cur,
                    slug: e.target.value
                      .toLowerCase()
                      .replace(/\s+/g, "-")
                      .replace(/[^a-z0-9-]/g, ""),
                  }))
                }
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
                placeholder="Ex.: alimentação"
              />
            </div>
            <div>
              <label htmlFor="dir-modo" className="mb-1 block text-sm font-medium text-marinha-700">
                Tipo de presença
              </label>
              <select
                id="dir-modo"
                value={form.modo}
                onChange={(e) => setForm((cur) => ({ ...cur, modo: e.target.value as "perfil" | "loja" }))}
                className="focus-ring min-h-[44px] w-full rounded-btn border-2 border-marinha-900/25 bg-white px-3 py-2 text-sm text-marinha-900"
              >
                <option value="perfil">Perfil de serviços</option>
                <option value="loja">Loja / catálogo</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="dir-headline" className="mb-1 block text-sm font-medium text-marinha-700">
              Chamada pública
            </label>
            <Input
              id="dir-headline"
              value={form.publicHeadline}
              onChange={(e) => setForm((cur) => ({ ...cur, publicHeadline: e.target.value }))}
              placeholder="Ex.: soluções elétricas para comércio, residência e prefeitura"
            />
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
              placeholder="Descreva seus diferenciais, experiência, atendimento e cobertura."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-marinha-700">WhatsApp</label>
              <Input value={form.whatsapp} onChange={(e) => setForm((cur) => ({ ...cur, whatsapp: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-marinha-700">Telefone</label>
              <Input value={form.phone} onChange={(e) => setForm((cur) => ({ ...cur, phone: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-marinha-700">E-mail</label>
              <Input value={form.email} onChange={(e) => setForm((cur) => ({ ...cur, email: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-marinha-700">Website</label>
              <Input value={form.website} onChange={(e) => setForm((cur) => ({ ...cur, website: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-marinha-700">Instagram</label>
              <Input value={form.instagram} onChange={(e) => setForm((cur) => ({ ...cur, instagram: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-marinha-700">Serviços oferecidos</label>
            <Textarea
              rows={4}
              value={form.servicesText}
              onChange={(e) => setForm((cur) => ({ ...cur, servicesText: e.target.value }))}
              placeholder={"Um serviço por linha\nInstalação elétrica\nManutenção preventiva\nOrçamento técnico"}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-serif text-lg text-marinha-900">Catálogo inicial</h3>
                <p className="text-sm text-marinha-500">Produtos ou serviços que podem aparecer no marketplace.</p>
              </div>
              <Button type="button" variant="secondary" onClick={addOffering}>
                Adicionar item
              </Button>
            </div>
            {form.offerings.map((off, index) => (
              <div key={index} className="rounded-btn border border-marinha-900/10 p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-marinha-700">Título</label>
                    <Input value={off.title} onChange={(e) => updateOffering(index, "title", e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-marinha-700">Tipo</label>
                    <select
                      value={off.kind}
                      onChange={(e) => updateOffering(index, "kind", e.target.value)}
                      className="focus-ring min-h-[44px] w-full rounded-btn border-2 border-marinha-900/25 bg-white px-3 py-2 text-sm text-marinha-900"
                    >
                      <option value="product">Produto</option>
                      <option value="service">Serviço</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-marinha-700">Preço/faixa</label>
                    <Input value={off.price} onChange={(e) => updateOffering(index, "price", e.target.value)} placeholder="Ex.: a partir de R$ 120" />
                  </div>
                  <div className="flex items-end justify-end">
                    <button type="button" onClick={() => removeOffering(index)} className="text-sm font-semibold text-red-600 hover:underline">
                      Remover item
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="mb-1 block text-sm font-medium text-marinha-700">Descrição</label>
                  <Textarea
                    rows={3}
                    value={off.description}
                    onChange={(e) => updateOffering(index, "description", e.target.value)}
                    placeholder="Resumo curto do item, escopo ou diferenciais."
                  />
                </div>
              </div>
            ))}
          </div>

          {selectedItem ? (
            <label className="flex cursor-pointer gap-3 text-sm text-marinha-700">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => setForm((cur) => ({ ...cur, isPublished: e.target.checked }))}
                className="focus-ring mt-1 h-4 w-4 rounded border-marinha-900/25 text-municipal-600"
              />
              <span>Perfil publicado no diretório e no marketplace quando aplicável</span>
            </label>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : selectedItem ? "Salvar alterações" : "Criar perfil"}
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
