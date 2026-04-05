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

export function PlatformAcademyPanel() {
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
      setErr("Sem permissão para gerir a Academia.");
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
    if (!title.trim()) {
      return;
    }
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
    setErr(null);
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
    if (!confirm("Remover este curso? Matrículas e aulas associadas serão apagadas.")) {
      return;
    }
    const res = await apiAuthFetch<unknown>(`/api/v1/platform/academy/courses/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setErr(res.error || "Erro ao remover.");
      return;
    }
    void load();
  }

  if (!getAccessToken()) {
    return null;
  }

  if (loading) {
    return (
      <section>
        <h2 className="font-serif text-lg text-marinha-900">Academia — cursos</h2>
        <p className="mt-2 text-sm text-marinha-500">A carregar cursos…</p>
      </section>
    );
  }

  if (err && !data) {
    return (
      <section>
        <h2 className="font-serif text-lg text-marinha-900">Academia — cursos</h2>
        <p className="mt-2 rounded-btn border border-alerta-500/30 bg-alerta-500/10 px-3 py-2 text-sm text-alerta-700">
          {err}
        </p>
        <Button type="button" variant="secondary" className="mt-3 text-sm" onClick={() => void load()}>
          Tentar novamente
        </Button>
      </section>
    );
  }

  return (
    <section>
      <h2 className="font-serif text-lg text-marinha-900">Academia — cursos</h2>
      <p className="mt-1 text-sm text-marinha-500">
        Criar e gerir cursos por município (tenant). Total: {data?.total ?? 0}
      </p>

      {err ? (
        <p className="mt-2 text-sm text-alerta-700">{err}</p>
      ) : null}

      <Card className="mt-4 p-4">
        <h3 className="font-semibold text-marinha-900">Novo curso</h3>
        <form onSubmit={onCreate} className="mt-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-marinha-600">Slug do município (tenant)</label>
            <Input
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              placeholder="luis-eduardo-magalhaes"
              className="mt-1"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-marinha-600">Título</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-marinha-600">Resumo</label>
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} className="mt-1 min-h-[80px]" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-marinha-600">Categoria</label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="block text-xs font-medium text-marinha-600">Duração (minutos)</label>
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
                className="rounded border-marinha-900/20"
              />
              Em destaque
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="rounded border-marinha-900/20"
              />
              Publicado
            </label>
          </div>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "A guardar…" : "Criar curso"}
          </Button>
        </form>
      </Card>

      <ul className="mt-6 space-y-3">
        {data?.items.map((row) => (
          <li key={row.id}>
            <Card className="p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="font-semibold text-marinha-900">{row.title}</p>
                  <p className="text-xs text-marinha-500">
                    {row.tenant?.name ? `${row.tenant.name} · ` : ""}
                    {row.tenant?.slug ?? "?"} · /academia/{row.slug}
                  </p>
                  {row.summary ? (
                    <p className="mt-2 line-clamp-2 text-sm text-marinha-600">{row.summary}</p>
                  ) : null}
                  <p className="mt-1 text-xs">
                    publicado: {row.isPublished ? "sim" : "não"} · destaque: {row.isFeatured ? "sim" : "não"}
                    {row.durationMinutes != null ? ` · ${row.durationMinutes} min` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/dashboard/plataforma/academia/cursos/${row.id}`}
                    className="inline-flex min-h-[36px] items-center rounded-btn border border-marinha-900/15 bg-white px-3 text-sm font-semibold text-municipal-800 hover:bg-municipal-600/10"
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
          </li>
        ))}
      </ul>
      {!data?.items.length ? (
        <p className="mt-4 text-sm text-marinha-500">Nenhum curso ainda. Utilize o formulário acima.</p>
      ) : null}
    </section>
  );
}
