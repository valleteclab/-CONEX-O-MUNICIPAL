"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiAuthFetch } from "@/lib/api-browser";
import { getAccessToken } from "@/lib/auth-storage";
import type { AcademyEnrollmentDto } from "@/types/academy";
import type { ApiListResponse } from "@/lib/api-server";

function pctLabel(n: number, status: string) {
  if (status === "completed") return "Concluído";
  return `${n}%`;
}

export function AcademyMyCoursesList() {
  const [data, setData] = useState<ApiListResponse<AcademyEnrollmentDto> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      setData(null);
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    const res = await apiAuthFetch<ApiListResponse<AcademyEnrollmentDto>>(
      "/api/v1/academy/my-courses?take=100",
    );
    setLoading(false);
    if (!res.ok || !res.data) {
      setError(res.error || "Não foi possível carregar");
      setData(null);
      return;
    }
    setData(res.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!getAccessToken()) {
    return (
      <p className="text-sm text-marinha-600">
        <Link href="/login" className="font-semibold text-municipal-700 hover:underline">
          Entre na sua conta
        </Link>{" "}
        para ver as suas formações.
      </p>
    );
  }

  if (loading) {
    return <p className="text-sm text-marinha-500">A carregar…</p>;
  }

  if (error) {
    return (
      <p className="rounded-btn border border-alerta-500/30 bg-alerta-500/10 px-3 py-2 text-sm text-alerta-600">
        {error}
      </p>
    );
  }

  if (!data?.items.length) {
    return (
      <p className="text-sm text-marinha-500">
        Ainda não está matriculado em cursos. Explore a{" "}
        <Link href="/academia" className="font-semibold text-municipal-700 hover:underline">
          Academia
        </Link>
        .
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {data.items.map((e) => (
        <li
          key={e.id}
          className="rounded-btn border border-marinha-900/10 bg-surface px-3 py-2 text-sm"
        >
          <p className="font-semibold text-marinha-900">{e.course.title}</p>
          <p className="mt-1 text-xs text-marinha-500">
            Progresso: {pctLabel(e.progressPercent, e.status)}
          </p>
          <Link
            href={`/academia/${e.course.slug}`}
            className="mt-2 inline-block text-xs font-medium text-municipal-700 hover:underline"
          >
            Abrir curso
          </Link>
        </li>
      ))}
    </ul>
  );
}
