"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { apiAuthFetch } from "@/lib/api-browser";
import { getAccessToken } from "@/lib/auth-storage";

type CourseRow = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  category: string | null;
  durationMinutes: number | null;
  isFeatured: boolean;
  isPublished: boolean;
  tenant?: { slug: string; name?: string };
};

type ListCourses = { items: CourseRow[]; total: number };

export default function AdminAcademiaPage() {
  const [data, setData] = useState<ListCourses | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantSlug, setTenantSlug] = useState("luis-eduardo-magalhaes");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPublished, setIsPublished] = useState(true);

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    const res = await apiAuthFetch<ListCourses>("/api/v1/platform/academy/courses?take=100&skip=0");
    setLoading(false);
    if (res.status === 403) {
      setErr("Sem permissão para gerenciar a Academia.");
      setData(null);
      return;
    }
    if (!res.ok || !res.data) {
      setErr(res.error || "Falha ao carregar cursos.");
      setData(null);
      return;
    }
    setData(res.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setErr(null);
    const body: Record<string, unknown> = {
      tenantSlug: tenantSlug.trim(),
      title: title.trim(),
      isFeatured,
      isPublished,
    };
    if (summary.trim()) body.summary = summary.trim();
    if (category.trim()) body.category = category.trim();
    if (durationMinutes.trim()) {
      const n = parseInt(durationMinutes, 10);
      if (Number.isFinite(n) && n > 0) body.durationMinutes = n;
    }
    const res = await apiAuthFetch<CourseRow>("/api/v1/platform/academy/courses", {
      method: "POST",
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      setErr(res.error || "Erro ao criar curso.");
      return;
    }
    setTitle("");
    setSummary("");
    setCategory("");
    setDurationMinutes("");
    setIsFeatured(false);
    setIsPublished(true);
    void load();
  }

  async function patchCourse(id: string, partial: Record<string, unknown>) {
    const res = await apiAuthFetch<CourseRow>(`/api/v1/platform/academy/courses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(partial),
    });
    if (!res.ok) {
      setErr(res.error || "Erro ao atualizar.");
      return;
    }
    void load();
  }

  async function removeCourse(id: string) {
    if (!confirm("Remover este curso? Matrículas e aulas associadas serão apagadas.")) return;
    const res = await apiAuthFetch<unknown>(`/api/v1/platform/academy/courses/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setErr(res.error || "Erro ao remover.");
      return;
    }
    void load();
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Carregando cursos…</p>;
  }

  if (err && !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {err}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Academia — Gestão de Cursos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Criar, editar e gerenciar cursos por município. Total:{" "}
          <span className="font-semibold">{data?.total ?? 0}</span>
        </p>
      </div>

      {err && <p className="mb-4 text-sm text-red-600">{err}</p>}

      <div className="space-y-4">
        {data?.items.map((row) => (
          <Card key={row.id} className="p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="font-semibold text-gray-900">{row.title}</p>
                <p className="text-xs text-gray-500">
                  {row.tenant?.name ? `${row.tenant.name} · ` : ""}
                  {row.tenant?.slug ?? "?"} · /academia/{row.slug}
                </p>
                {row.summary && (
                  <p className="mt-2 line-clamp-2 text-sm text-gray-600">{row.summary}</p>
                )}
                <p className="mt-1 text-xs">
                  publicado: {row.isPublished ? "sim" : "não"} · destaque:{" "}
                  {row.isFeatured ? "sim" : "não"}
                  {row.durationMinutes != null ? ` · ${row.durationMinutes} min` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/dashboard/plataforma/academia/cursos/${row.id}`}
                  className="inline-flex min-h-[36px] items-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Aulas (YouTube)
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-sm"
                  onClick={() => void patchCourse(row.id, { isPublished: !row.isPublished })}
                >
                  {row.isPublished ? "Ocultar" : "Publicar"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-sm"
                  onClick={() => void patchCourse(row.id, { isFeatured: !row.isFeatured })}
                >
                  {row.isFeatured ? "Tirar destaque" : "Destaque"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="text-sm"
                  onClick={() => void removeCourse(row.id)}
                >
                  Remover
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {!data?.items.length && (
          <p className="rounded-lg bg-gray-50 px-4 py-4 text-sm text-gray-500">
            Ainda não há cursos. Use o formulário abaixo para criar o primeiro.
          </p>
        )}
      </div>

      <details className="group mt-8 rounded-lg border border-municipal-600/25 bg-municipal-600/5">
        <summary className="cursor-pointer px-4 py-3 font-semibold text-gray-900 marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            <span className="text-municipal-800 transition-transform group-open:rotate-90">▸</span>
            Criar novo curso
          </span>
          <span className="mt-1 block text-xs font-normal text-gray-500">
            Escolha o município (slug), título e se fica publicado na Academia.
          </span>
        </summary>
        <div className="border-t border-gray-200 px-4 pb-4 pt-2">
          <form onSubmit={onCreate} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600">Slug do município</label>
              <Input
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                placeholder="luis-eduardo-magalhaes"
                className="mt-1"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Título</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Resumo</label>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="mt-1 min-h-[80px]"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-600">Categoria</label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600">Duração (minutos)</label>
                <Input
                  type="number"
                  min={1}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Em destaque
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Publicado
              </label>
            </div>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Salvando…" : "Criar curso"}
            </Button>
          </form>
        </div>
      </details>
    </div>
  );
}
