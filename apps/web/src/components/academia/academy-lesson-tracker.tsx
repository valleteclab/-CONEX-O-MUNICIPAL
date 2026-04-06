"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiAuthFetch } from "@/lib/api-browser";
import { getPublicApiBaseUrl } from "@/lib/api-public";
import { getAccessToken, getTenantId } from "@/lib/auth-storage";
import { cn } from "@/lib/cn";
import { toYoutubeEmbedUrl, youtubeThumbUrl, youtubeVideoIdFromUrl } from "@/lib/youtube";
import type { AcademyLearningResponse, AcademyLessonDto } from "@/types/academy";

type Props = {
  courseId: string;
  slug: string;
  initialLessons: AcademyLessonDto[];
};

export function AcademyLessonTracker({ courseId, slug, initialLessons }: Props) {
  const [lessons, setLessons] = useState(initialLessons);
  const [learning, setLearning] = useState<AcademyLearningResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(() => initialLessons[0]?.id ?? null);

  const loadLearning = useCallback(async () => {
    if (!getAccessToken()) {
      return;
    }
    const res = await apiAuthFetch<AcademyLearningResponse>(
      `/api/v1/academy/courses/${encodeURIComponent(slug)}/learning`,
    );
    if (res.ok && res.data) {
      setLearning(res.data);
      setLessons(res.data.lessons);
    }
  }, [slug]);

  useEffect(() => {
    void loadLearning();
  }, [loadLearning]);

  useEffect(() => {
    if (!lessons.length) {
      return;
    }
    if (!activeId || !lessons.some((l) => l.id === activeId)) {
      setActiveId(lessons[0].id);
    }
  }, [lessons, activeId]);

  async function completeLesson(lessonId: string) {
    setErr(null);
    setLoading(true);
    const res = await apiAuthFetch<AcademyLearningResponse>(
      `/api/v1/academy/courses/${courseId}/lessons/${lessonId}/complete`,
      { method: "POST" },
    );
    setLoading(false);
    if (!res.ok || !res.data) {
      setErr(res.error || "Não foi possível registrar a aula.");
      return;
    }
    setLearning(res.data);
    setLessons(res.data.lessons);
  }

  async function downloadCertificate() {
    const base = getPublicApiBaseUrl();
    const token = getAccessToken();
    const tid = getTenantId();
    if (!base || !token) {
      return;
    }
    const res = await fetch(
      `${base}/api/v1/academy/my-courses/${courseId}/certificate`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(tid ? { "X-Tenant-Id": tid } : {}),
        },
      },
    );
    if (!res.ok) {
      setErr("Certificado disponível após concluir todas as aulas.");
      return;
    }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `certificado-${courseId.slice(0, 8)}.pdf`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const completed = new Set(learning?.completedLessonIds ?? []);
  const enrolled = !!learning?.enrollment;
  const doneCourse = learning?.enrollment?.status === "completed";

  const activeLesson = lessons.find((l) => l.id === activeId) ?? lessons[0] ?? null;
  const activeEmbed = activeLesson ? toYoutubeEmbedUrl(activeLesson.videoUrl ?? null) : null;
  const activeIndex = activeLesson ? lessons.findIndex((l) => l.id === activeLesson.id) : -1;

  return (
    <section>
      {learning != null && getAccessToken() ? (
        <Card className="mb-6 border-municipal-600/20 bg-municipal-600/5 p-4">
          <p className="text-sm text-marinha-700">
            <strong>Pontos (Academia):</strong> {learning.points} ·{" "}
            <strong>Progresso:</strong> {learning.enrollment?.progressPercent ?? 0}%
            {doneCourse ? " · Curso concluído" : ""}
          </p>
          {doneCourse ? (
            <Button
              type="button"
              variant="accent"
              className="mt-3 text-sm"
              onClick={() => void downloadCertificate()}
            >
              Descarregar certificado (PDF)
            </Button>
          ) : null}
        </Card>
      ) : null}

      {err ? (
        <p className="mb-4 rounded-btn border border-alerta-500/30 bg-alerta-500/10 px-3 py-2 text-sm text-alerta-700">
          {err}
        </p>
      ) : null}

      <h2 className="font-serif text-lg text-marinha-900">Trilha — aulas</h2>
      <p className="mt-1 text-sm text-marinha-500">
        Escolha uma aula na lista à direita (ou abaixo no telemóvel) — o vídeo abre em destaque. Os
        vídeos na lista aparecem só como miniatura; não carregam todos ao mesmo tempo.
      </p>

      {!lessons.length ? (
        <p className="mt-4 text-sm text-marinha-500">
          Ainda não há aulas. O super administrador pode adicionar vídeos (YouTube) no painel da
          plataforma.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-6 xl:flex-row xl:items-start">
          {/* Reprodutor principal — um único iframe */}
          <div className="min-w-0 flex-1 space-y-4">
            {activeLesson && activeEmbed ? (
              <>
                <div className="overflow-hidden rounded-xl border border-marinha-900/10 bg-black shadow-lg">
                  <div className="relative aspect-video w-full">
                    <iframe
                      title={activeLesson.title}
                      src={`${activeEmbed}?rel=0`}
                      className="absolute inset-0 h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-marinha-500">
                    Aula {activeIndex + 1} de {lessons.length}
                    {activeLesson.durationMinutes != null ?
                      ` · ~${activeLesson.durationMinutes} min`
                    : null}
                    {completed.has(activeLesson.id) ? (
                      <span className="ml-2 font-semibold text-municipal-700">· Concluída</span>
                    ) : null}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-marinha-900">{activeLesson.title}</h3>
                  {activeLesson.contentMd ? (
                    <div className="mt-3 whitespace-pre-wrap text-sm text-marinha-600">
                      {activeLesson.contentMd}
                    </div>
                  ) : null}
                  {enrolled && !completed.has(activeLesson.id) ? (
                    <Button
                      type="button"
                      variant="primary"
                      className="mt-4 text-sm"
                      disabled={loading}
                      onClick={() => void completeLesson(activeLesson.id)}
                    >
                      Marcar esta aula como concluída
                    </Button>
                  ) : null}
                  {!getAccessToken() ? (
                    <p className="mt-3 text-xs text-marinha-500">
                      Entre na conta para registrar o progresso das aulas.
                    </p>
                  ) : null}
                </div>
              </>
            ) : activeLesson ? (
              <Card className="p-4">
                <p className="text-sm text-marinha-600">Esta aula não tem URL de vídeo válida.</p>
                {activeLesson.contentMd ? (
                  <div className="mt-2 whitespace-pre-wrap text-sm text-marinha-600">
                    {activeLesson.contentMd}
                  </div>
                ) : null}
              </Card>
            ) : null}
          </div>

          {/* Lista compacta — miniaturas pequenas, sem iframe */}
          <aside className="w-full shrink-0 xl:w-[300px] xl:max-w-[320px]">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-marinha-500">
              Todas as aulas ({lessons.length})
            </p>
            <ul className="max-h-[min(420px,55vh)] space-y-2 overflow-y-auto pr-1 xl:max-h-[min(520px,70vh)]">
              {lessons.map((lesson, idx) => {
                const vid = youtubeVideoIdFromUrl(lesson.videoUrl ?? null);
                const isActive = lesson.id === activeId;
                const isDone = completed.has(lesson.id);
                return (
                  <li key={lesson.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(lesson.id)}
                      className={cn(
                        "flex w-full gap-2 rounded-lg border p-2 text-left transition-colors touch-manipulation",
                        isActive ?
                          "border-municipal-600 bg-municipal-600/10 ring-1 ring-municipal-600/30"
                        : "border-marinha-900/10 bg-white hover:bg-marinha-900/[0.03]",
                      )}
                    >
                      <div className="relative h-14 w-[100px] shrink-0 overflow-hidden rounded-md bg-marinha-900/10">
                        {vid ? (
                          <Image
                            src={youtubeThumbUrl(vid, "default")}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="100px"
                          />
                        ) : (
                          <span className="flex h-full items-center justify-center text-[10px] text-marinha-500">
                            {idx + 1}
                          </span>
                        )}
                        <span className="absolute bottom-0.5 right-0.5 rounded bg-black/75 px-1 text-[10px] font-medium text-white">
                          {idx + 1}
                        </span>
                      </div>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-xs font-medium leading-snug text-marinha-900">
                          {lesson.title}
                        </span>
                        {isDone ? (
                          <span className="mt-0.5 block text-[10px] font-medium text-municipal-700">
                            Concluída
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      )}
    </section>
  );
}
