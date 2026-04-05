"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiAuthFetch } from "@/lib/api-browser";
import { getPublicApiBaseUrl } from "@/lib/api-public";
import { getAccessToken, getTenantId } from "@/lib/auth-storage";
import { toYoutubeEmbedUrl } from "@/lib/youtube";
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
      <ul className="mt-4 space-y-6">
        {lessons.map((lesson, idx) => {
          const embed = toYoutubeEmbedUrl(lesson.videoUrl ?? null);
          const isDone = completed.has(lesson.id);
          return (
            <li key={lesson.id}>
              <Card className="overflow-hidden p-0">
                {embed ? (
                  <div className="aspect-video w-full bg-marinha-900/10">
                    <iframe
                      title={lesson.title}
                      src={`${embed}?rel=0`}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : null}
                <div className="p-4">
                  <p className="text-xs font-medium text-marinha-500">
                    Aula {idx + 1}
                    {lesson.durationMinutes != null ? ` · ~${lesson.durationMinutes} min` : null}
                    {isDone ? (
                      <span className="ml-2 font-semibold text-municipal-700">· Concluída</span>
                    ) : null}
                  </p>
                  <h3 className="mt-1 font-semibold text-marinha-900">{lesson.title}</h3>
                  {lesson.contentMd ? (
                    <div className="mt-2 whitespace-pre-wrap text-sm text-marinha-600">{lesson.contentMd}</div>
                  ) : null}
                  {enrolled && !isDone ? (
                    <Button
                      type="button"
                      variant="primary"
                      className="mt-4 text-sm"
                      disabled={loading}
                      onClick={() => void completeLesson(lesson.id)}
                    >
                      Marcar como concluída
                    </Button>
                  ) : null}
                  {!getAccessToken() && embed ? (
                    <p className="mt-3 text-xs text-marinha-500">
                      Entre na conta para registrar o progresso das aulas.
                    </p>
                  ) : null}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
      {!lessons.length ? (
        <p className="mt-4 text-sm text-marinha-500">
          Ainda não há aulas. O super administrador pode adicionar vídeos (YouTube) no painel da plataforma.
        </p>
      ) : null}
    </section>
  );
}
