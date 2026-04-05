"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiAuthFetch } from "@/lib/api-browser";
import { getAccessToken } from "@/lib/auth-storage";

type Props = {
  courseId: string;
};

export function CourseActions({ courseId }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"enroll" | "complete" | null>(null);

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
      setError(res.error || "Conclua a matrícula primeiro ou tente novamente.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      {error ? (
        <p className="w-full rounded-btn border border-alerta-500/30 bg-alerta-500/10 px-3 py-2 text-sm text-alerta-600">
          {error}
        </p>
      ) : null}
      <Button type="button" variant="primary" disabled={loading !== null} onClick={() => void enroll()}>
        {loading === "enroll" ? "A matricular…" : "Matricular-me"}
      </Button>
      <Button type="button" variant="secondary" disabled={loading !== null} onClick={() => void complete()}>
        {loading === "complete" ? "A guardar…" : "Marcar como concluído"}
      </Button>
      <Link
        href="/dashboard/academia"
        className="text-sm font-medium text-municipal-700 underline-offset-2 hover:underline"
      >
        Minhas formações
      </Link>
    </div>
  );
}
