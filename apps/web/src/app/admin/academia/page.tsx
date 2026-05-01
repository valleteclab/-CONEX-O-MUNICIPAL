"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { ACADEMY_COURSE_CATEGORIES } from "@/lib/academy-categories";
import { apiAuthFetch } from "@/lib/api-browser";
import { getAccessToken } from "@/lib/auth-storage";
import { cn } from "@/lib/cn";

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

function isPlaylistUrl(u: string): boolean {
  try {
    return new URL(u.trim()).searchParams.has("list");
  } catch {
    return false;
  }
}

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
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [firstLessonTitle, setFirstLessonTitle] = useState("");
  const [ytPreview, setYtPreview] = useState<{
    title: string;
    authorName: string;
    thumbnailUrl: string;
  } | null>(null);
  const [ytFetching, setYtFetching] = useState(false);
  const [ytErr, setYtErr] = useState<string | null>(null);
  const [playlistPreview, setPlaylistPreview] = useState<{
    playlistId: string;
    items: { title: string; videoUrl: string }[];
  } | null>(null);
  const [durationHint, setDurationHint] = useState<string | null>(null);

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

  async function fetchDurationMeta(u: string) {
    const dRes = await apiAuthFetch<{
      durationMinutes: number | null;
      playlistTotalMinutes: number | null;
      playlistVideoCount: number | null;
      hint: string | null;
    }>(`/api/v1/platform/academy/youtube/duration-preview?url=${encodeURIComponent(u)}`);
    if (!dRes.ok || !dRes.data) {
      setDurationHint(null);
      return;
    }
    const d = dRes.data;
    if (d.durationMinutes != null) {
      setDurationMinutes(String(d.durationMinutes));
    } else if (d.playlistTotalMinutes != null) {
      setDurationMinutes(String(d.playlistTotalMinutes));
    }
    setDurationHint(d.hint);
  }

  async function fetchYoutubeMeta() {
    const u = youtubeUrl.trim();
    if (!u) {
      setYtErr("Cole o link do YouTube.");
      return;
    }
    setYtFetching(true);
    setYtErr(null);
    setPlaylistPreview(null);
    setDurationHint(null);
    try {
      if (isPlaylistUrl(u)) {
        const res = await apiAuthFetch<{
          playlistId: string;
          items: { title: string; videoUrl: string }[];
        }>(
          `/api/v1/platform/academy/youtube/playlist-preview?url=${encodeURIComponent(u)}`,
        );
        if (!res.ok || !res.data) {
          setYtErr(
            res.error ||
              "Não foi possível ler a playlist. Verifique o link ou acione a equipe responsável.",
          );
          setYtPreview(null);
          return;
        }
        setPlaylistPreview(res.data);
        setYtPreview(null);
        await fetchDurationMeta(u);
        return;
      }

      const r = await fetch(`/api/youtube-oembed?url=${encodeURIComponent(u)}`);
      const data = (await r.json()) as {
        title?: string;
        authorName?: string;
        thumbnailUrl?: string;
        message?: string;
      };
      if (!r.ok) {
        setYtErr(data.message || "Não foi possível obter dados do vídeo.");
        setYtPreview(null);
        return;
      }
      setYtPreview({
        title: data.title ?? "",
        authorName: data.authorName ?? "",
        thumbnailUrl: data.thumbnailUrl ?? "",
      });
      setFirstLessonTitle(data.title?.trim() || "Aula em vídeo");
      await fetchDurationMeta(u);
    } catch {
      setYtErr("Falha de rede ao contactar o servidor.");
      setYtPreview(null);
    } finally {
      setYtFetching(false);
    }
  }

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
    const ytu = youtubeUrl.trim();
    if (ytu) {
      body.firstLessonYoutubeUrl = ytu;
      if (!isPlaylistUrl(ytu)) {
        body.firstLessonTitle = firstLessonTitle.trim() || "Aula em vídeo";
      }
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
    setYoutubeUrl("");
    setFirstLessonTitle("");
    setYtPreview(null);
    setPlaylistPreview(null);
    setYtErr(null);
    setDurationHint(null);
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
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <label className="block text-xs font-medium text-gray-600">
                Trilha — link do YouTube (opcional)
              </label>
              <p className="mt-0.5 text-xs text-gray-500">
                Cole o link de um vídeo para criar uma aula ou o link de uma playlist para importar a trilha completa.
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                <Input
                  value={youtubeUrl}
                  onChange={(e) => {
                    setYoutubeUrl(e.target.value);
                    setPlaylistPreview(null);
                    setYtPreview(null);
                    setYtErr(null);
                    setDurationHint(null);
                  }}
                  placeholder="Cole aqui o link do vídeo ou da playlist"
                  className="min-w-0 flex-1"
                  type="url"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="shrink-0 text-sm"
                  disabled={ytFetching}
                  onClick={() => void fetchYoutubeMeta()}
                >
                  {ytFetching ? "Buscando…" : "Pré-visualizar"}
                </Button>
              </div>
              {ytErr ? <p className="mt-2 text-xs text-red-600">{ytErr}</p> : null}
              {playlistPreview ? (
                <div className="mt-3 rounded-md border border-teal-200 bg-teal-50/60 p-3 text-sm">
                  <p className="font-medium text-gray-900">
                    Trilha: {playlistPreview.items.length} vídeos (playlist {playlistPreview.playlistId.slice(0, 12)}…)
                  </p>
                  <ol className="mt-2 max-h-40 list-decimal space-y-1 overflow-y-auto pl-5 text-xs text-gray-700">
                    {playlistPreview.items.slice(0, 40).map((it, i) => (
                      <li key={`${it.videoUrl}-${i}`}>{it.title}</li>
                    ))}
                  </ol>
                  {playlistPreview.items.length > 40 ? (
                    <p className="mt-2 text-xs text-gray-500">… e mais {playlistPreview.items.length - 40} aulas</p>
                  ) : null}
                </div>
              ) : null}
              {ytPreview ? (
                <div className="mt-3 flex gap-3 rounded-md border border-teal-100 bg-teal-50/50 p-2">
                  {ytPreview.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ytPreview.thumbnailUrl}
                      alt=""
                      className="h-16 w-28 shrink-0 rounded object-cover"
                    />
                  ) : null}
                  <div className="min-w-0 text-sm">
                    <p className="font-medium text-gray-900">{ytPreview.title || "Vídeo"}</p>
                    {ytPreview.authorName ? (
                      <p className="text-xs text-gray-600">{ytPreview.authorName}</p>
                    ) : null}
                    <button
                      type="button"
                      className="mt-1 text-xs font-medium text-municipal-700 underline"
                      onClick={() => {
                        if (ytPreview.title) setTitle(ytPreview.title);
                      }}
                    >
                      Usar título do vídeo no nome do curso
                    </button>
                  </div>
                </div>
              ) : null}
              {youtubeUrl.trim() && !isPlaylistUrl(youtubeUrl) ? (
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-600">
                    Título da primeira aula
                  </label>
                  <Input
                    value={firstLessonTitle}
                    onChange={(e) => setFirstLessonTitle(e.target.value)}
                    placeholder="Ex.: Introdução"
                    className="mt-1"
                  />
                </div>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-600">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={cn(
                    "mt-1 w-full min-h-[44px] rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-sm text-gray-900",
                    "focus:border-municipal-600 focus:outline-none focus:ring-2 focus:ring-municipal-600/25",
                  )}
                >
                  <option value="">— Selecione uma categoria —</option>
                  {ACADEMY_COURSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Lista padrão do sistema; use a mesma etiqueta nos filtros do portal público.
                </p>
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
                {durationHint ? (
                  <p className="mt-1 text-xs text-amber-800">{durationHint}</p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">
                    Preenchido automaticamente quando a duração estiver disponível.
                  </p>
                )}
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
