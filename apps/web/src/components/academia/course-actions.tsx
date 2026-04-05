"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiAuthFetch } from "@/lib/api-browser";
import { getAccessToken } from "@/lib/auth-storage";

type EnrollmentStatus = {
  enrolled: boolean;
  status: string | null; // 'active' | 'completed' | null
};

type Props = {
  courseId: string;
};

export function CourseActions({ courseId }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"enroll" | "complete" | "checking" | null>("checking");
  const [enrollment, setEnrollment] = useState<EnrollmentStatus>({ enrolled: false, status: null });

  useEffect(() => {
    if (!getAccessToken()) {
      setLoading(null);
      return;
    }
    // Carrega estado de matrícula
    apiAuthFetch<{ enrollments: { courseId: string; status: string }[] }>(
      "/api/v1/academy/my-courses",
    ).then((res) => {
      if (res.ok && res.data) {
        const found = res.data.enrollments?.find((e) => e.courseId === courseId);
        setEnrollment({ enrolled: !!found, status: found?.status ?? null });
      }
      setLoading(null);
    });
  }, [courseId]);

  if (!getAccessToken()) {
    return (
      <p className="text-sm text-marinha-600">
        <Link href="/login" className="font-semibold text-municipal-700 hover:underline">
          Entre
        </Link>{" "}
        para se matricular e acompanhar o progresso.
      </p>
    );
  }

  if (loading === "checking") {
    return <div className="h-9 w-40 animate-pulse rounded-btn bg-marinha-900/8" />;
  }

  async function enroll() {
    setError(null);
    setLoading("enroll");
    const res = await apiAuthFetch<{ id: string }>(
      `/api/v1/academy/courses/${courseId}/enroll`,
      { method: "POST" },
    );
    setLoading(null);
    if (!res.ok) {
      setError(res.error || "Não foi possível matricular");
      return;
    }
    setEnrollment({ enrolled: true, status: "active" });
    router.refresh();
  }

  async function complete() {
    setError(null);
    setLoading("complete");
    const res = await apiAuthFetch<{ id: string }>(
      `/api/v1/academy/my-courses/${courseId}/complete`,
      { method: "POST" },
    );
    setLoading(null);
    if (!res.ok) {
      setError(res.error || "Não foi possível marcar como concluído.");
      return;
    }
    setEnrollment((prev) => ({ ...prev, status: "completed" }));
    router.refresh();
  }

  const isCompleted = enrollment.status === "completed";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      {error ? (
        <p className="w-full rounded-btn border border-alerta-500/30 bg-alerta-500/10 px-3 py-2 text-sm text-alerta-600">
          {error}
        </p>
      ) : null}

      {!enrollment.enrolled && (
        <Button
          type="button"
          variant="primary"
          disabled={loading !== null}
          onClick={() => void enroll()}
        >
          {loading === "enroll" ? "Matriculando…" : "Matricular-me"}
        </Button>
      )}

      {enrollment.enrolled && !isCompleted && (
        <Button
          type="button"
          variant="secondary"
          disabled={loading !== null}
          onClick={() => void complete()}
        >
          {loading === "complete" ? "Salvando…" : "Marcar como concluído"}
        </Button>
      )}

      {isCompleted && (
        <span className="rounded-full bg-municipal-100 px-3 py-1 text-sm font-semibold text-municipal-800">
          Curso concluído
        </span>
      )}

      {enrollment.enrolled && (
        <Link
          href="/dashboard/academia"
          className="text-sm font-medium text-municipal-700 underline-offset-2 hover:underline"
        >
          Minhas formações
        </Link>
      )}
    </div>
  );
}
