"use client";

import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { AcademyCourseDto } from "@/types/academy";

export function AcademyCourseCard({
  course,
  href,
  variant = "default",
  progressPercent,
  isAuthenticated = false,
}: {
  course: AcademyCourseDto;
  href: string;
  variant?: "default" | "featured";
  /** Só existe quando há matrícula neste curso */
  progressPercent?: number | null;
  isAuthenticated?: boolean;
}) {
  const lessons = course.lessonCount ?? 0;
  const progress =
    typeof progressPercent === "number" && Number.isFinite(progressPercent) ?
      Math.min(100, Math.max(0, Math.round(progressPercent)))
    : null;
  const hasEnrollment = typeof progressPercent === "number";

  return (
    <Link href={href} className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-municipal-600 focus-visible:ring-offset-2">
      <Card
        variant={variant}
        className="flex h-full flex-col overflow-hidden p-0 transition-transform duration-200 group-hover:-translate-y-0.5"
      >
        <div className="relative aspect-[16/9] w-full shrink-0 bg-gradient-to-br from-marinha-900/15 to-municipal-600/10">
          {course.thumbnailUrl ? (
            <Image
              src={course.thumbnailUrl}
              alt=""
              fill
              className="object-cover transition duration-300 group-hover:scale-[1.02]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-4 text-center text-xs text-marinha-500">
              Trilha em vídeo
            </div>
          )}
          {course.category ? (
            <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-municipal-800 shadow-sm backdrop-blur-sm">
              {course.category}
            </span>
          ) : null}
          {course.isFeatured ? (
            <span className="absolute right-2 top-2 rounded-full bg-municipal-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
              Destaque
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-municipal-700">
            Trilha
            {lessons > 0 ?
              ` · ${lessons} ${lessons === 1 ? "aula" : "aulas"}`
            : null}
          </p>
          <h3 className="mt-1.5 font-serif text-lg leading-snug text-marinha-900 group-hover:text-municipal-800">
            {course.title}
          </h3>
          {course.summary ? (
            <p className="mt-2 line-clamp-2 text-sm text-marinha-600">{course.summary}</p>
          ) : null}
          {course.durationMinutes != null ? (
            <p className="mt-3 text-xs text-marinha-500">~{course.durationMinutes} min estimados</p>
          ) : null}

          {hasEnrollment ? (
            <div className="mt-4 border-t border-marinha-900/10 pt-3">
              <div className="mb-1 flex items-center justify-between text-xs text-marinha-600">
                <span>O seu progresso</span>
                <span className="font-semibold text-municipal-800">{progress}%</span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-marinha-900/10"
                role="progressbar"
                aria-valuenow={progress ?? 0}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-municipal-600 transition-[width] duration-500"
                  style={{ width: `${progress ?? 0}%` }}
                />
              </div>
            </div>
          ) : isAuthenticated ? (
            <p className="mt-4 text-xs text-marinha-500">
              Abra a trilha e matricule-se para registar o progresso.
            </p>
          ) : (
            <p className="mt-4 text-xs text-marinha-500">
              Entre na conta para ver o progresso nas trilhas em que se matricular.
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}
