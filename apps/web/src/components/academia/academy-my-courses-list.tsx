"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiAuthFetch } from "@/lib/api-browser";
import { getPublicApiBaseUrl } from "@/lib/api-public";
import { getAccessToken, getTenantId } from "@/lib/auth-storage";
import type {
  AcademyEnrollmentDto,
  AcademyGamificationSummaryDto,
} from "@/types/academy";
import type { ApiListResponse } from "@/lib/api-server";

function pctLabel(n: number, status: string) {
  if (status === "completed") return "Concluído";
  return `${n}%`;
}

async function downloadCertificatePdf(courseId: string): Promise<void> {
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
    return;
  }
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `certificado-${courseId.slice(0, 8)}.pdf`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function AcademyMyCoursesList() {
  const [data, setData] = useState<ApiListResponse<AcademyEnrollmentDto> | null>(null);
  const [gamification, setGamification] = useState<AcademyGamificationSummaryDto | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      setData(null);
      setGamification(null);
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    const [coursesRes, gamRes] = await Promise.all([
      apiAuthFetch<ApiListResponse<AcademyEnrollmentDto>>(
        "/api/v1/academy/my-courses?take=100",
      ),
      apiAuthFetch<AcademyGamificationSummaryDto>("/api/v1/academy/gamification/me"),
    ]);
    setLoading(false);
    if (!coursesRes.ok || !coursesRes.data) {
      setError(coursesRes.error || "Não foi possível carregar");
      setData(null);
      setGamification(null);
      return;
    }
    setData(coursesRes.data);
    setGamification(gamRes.ok && gamRes.data ? gamRes.data : null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!getAccessToken()) {
    return (
      <p className="text-sm text-marinha-600">
        <Link href="/entrar?intent=portal" className="font-semibold text-municipal-700 hover:underline">
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
    <div className="space-y-4">
      {gamification != null ? (
        <div className="rounded-btn border border-municipal-600/20 bg-municipal-600/5 px-3 py-3 text-sm text-marinha-800">
          <p>
            <strong>Pontos (Academia):</strong> {gamification.points}
          </p>
          {gamification.badges.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {gamification.badges.map((b) => (
                <li
                  key={`${b.slug}-${b.earnedAt}`}
                  className="rounded-full border border-marinha-900/15 bg-surface px-2.5 py-1 text-xs text-marinha-800"
                  title={b.description ?? undefined}
                >
                  {b.title}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-marinha-500">
              Conclua cursos para ganhar distintivos.
            </p>
          )}
        </div>
      ) : null}

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
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              <Link
                href={`/academia/${e.course.slug}`}
                className="inline-block text-xs font-medium text-municipal-700 hover:underline"
              >
                Abrir curso
              </Link>
              {e.status === "completed" ? (
                <button
                  type="button"
                  className="text-xs font-medium text-municipal-700 hover:underline"
                  onClick={() => void downloadCertificatePdf(e.course.id)}
                >
                  Certificado (PDF)
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
