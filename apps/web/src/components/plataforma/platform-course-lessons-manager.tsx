"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { apiAuthFetch } from "@/lib/api-browser";
import { getAccessToken } from "@/lib/auth-storage";

type LessonRow = {
  id: string;
  title: string;
  videoUrl: string | null;
  contentMd: string | null;
  sortOrder: number;
  durationMinutes: number | null;
  lessonKind: string;
};

export function PlatformCourseLessonsManager({ courseId }: { courseId: string }) {
  const [items, setItems] = useState<LessonRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [contentMd, setContentMd] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      return;
    }
    const res = await apiAuthFetch<LessonRow[]>(
      `/api/v1/platform/academy/courses/${courseId}/lessons`,
    );
    if (!res.ok) {
      setErr(res.error || "Falha ao carregar aulas.");
      setItems(null);
      return;
    }
    setErr(null);
    setItems(res.data ?? []);
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      return;
    }
    setSaving(true);
    const body: Record<string, unknown> = {
      title: title.trim(),
      sortOrder: parseInt(sortOrder, 10) || 0,
      lessonKind: "youtube",
    };
    if (videoUrl.trim()) body.videoUrl = videoUrl.trim();
    if (contentMd.trim()) body.contentMd = contentMd.trim();
    const res = await apiAuthFetch<LessonRow>(
      `/api/v1/platform/academy/courses/${courseId}/lessons`,
      { method: "POST", body: JSON.stringify(body) },
    );
    setSaving(false);
    if (!res.ok) {
      setErr(res.error || "Erro ao criar aula.");
      return;
    }
    setTitle("");
    setVideoUrl("");
    setContentMd("");
    setSortOrder("0");
    void load();
  }

  async function removeLesson(id: string) {
    if (!confirm("Remover esta aula?")) {
      return;
    }
    const res = await apiAuthFetch(`/api/v1/platform/academy/lessons/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setErr(res.error || "Erro ao remover.");
      return;
    }
    void load();
  }

  if (!getAccessToken()) {
    return <p className="text-sm text-marinha-600">Faça login como super administrador.</p>;
  }

  if (err && !items) {
    return (
      <p className="rounded-btn border border-alerta-500/30 bg-alerta-500/10 px-3 py-2 text-sm text-alerta-700">
        {err}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {err ? <p className="text-sm text-alerta-700">{err}</p> : null}

      <Card className="p-4">
        <h2 className="font-semibold text-marinha-900">Nova aula (YouTube)</h2>
        <form onSubmit={onCreate} className="mt-3 space-y-3">
          <div>
            <label className="text-xs font-medium text-marinha-600">Título</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" required />
          </div>
          <div>
            <label className="text-xs font-medium text-marinha-600">URL do vídeo (YouTube)</label>
            <Input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-marinha-600">Texto / notas (opcional)</label>
            <Textarea value={contentMd} onChange={(e) => setContentMd(e.target.value)} className="mt-1 min-h-[72px]" />
          </div>
          <div>
            <label className="text-xs font-medium text-marinha-600">Ordem</label>
            <Input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="mt-1 w-24"
            />
          </div>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "A guardar…" : "Adicionar aula"}
          </Button>
        </form>
      </Card>

      <div>
        <h2 className="font-serif text-lg text-marinha-900">Aulas cadastradas</h2>
        <ul className="mt-4 space-y-2">
          {(items ?? []).map((l) => (
            <li key={l.id}>
              <Card className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-marinha-900">{l.title}</p>
                  <p className="text-xs text-marinha-500">
                    ordem {l.sortOrder}
                    {l.videoUrl ? " · com vídeo" : ""}
                  </p>
                </div>
                <Button type="button" variant="secondary" className="text-sm" onClick={() => void removeLesson(l.id)}>
                  Remover
                </Button>
              </Card>
            </li>
          ))}
        </ul>
        {!items?.length ? (
          <p className="mt-2 text-sm text-marinha-500">Nenhuma aula ainda.</p>
        ) : null}
      </div>
    </div>
  );
}
