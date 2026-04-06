"use client";

import { useEffect, useState } from "react";
import { AcademyCourseCard } from "@/components/academia/academy-course-card";
import { apiAuthFetch } from "@/lib/api-browser";
import { getAccessToken } from "@/lib/auth-storage";
import type { AcademyCourseDto, AcademyEnrollmentDto } from "@/types/academy";

export function AcademyCatalogWithProgress({
  courses,
  variant = "default",
}: {
  courses: AcademyCourseDto[];
  variant?: "default" | "featured";
}) {
  const [progressByCourse, setProgressByCourse] = useState<Record<string, number>>({});
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(!!getAccessToken());
  }, []);

  useEffect(() => {
    if (!getAccessToken()) {
      return;
    }
    void (async () => {
      const res = await apiAuthFetch<{ items: AcademyEnrollmentDto[] }>(
        "/api/v1/academy/my-courses?take=100",
      );
      if (!res.ok || !res.data?.items) {
        return;
      }
      const m: Record<string, number> = {};
      for (const e of res.data.items) {
        m[e.course.id] = e.progressPercent;
      }
      setProgressByCourse(m);
    })();
  }, []);

  if (!courses.length) {
    return null;
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((c) => (
        <AcademyCourseCard
          key={c.id}
          course={c}
          href={`/academia/${c.slug}`}
          variant={variant}
          progressPercent={progressByCourse[c.id]}
          isAuthenticated={authed}
        />
      ))}
    </div>
  );
}
