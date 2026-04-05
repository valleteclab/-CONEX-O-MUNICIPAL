export type AcademyCourseDto = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  durationMinutes: number | null;
  category: string | null;
  isFeatured: boolean;
};

export type AcademyLessonDto = {
  id: string;
  title: string;
  contentMd: string | null;
  sortOrder: number;
  durationMinutes: number | null;
  videoUrl?: string | null;
  lessonKind?: string;
};

export type AcademyLearningResponse = {
  course: AcademyCourseDto;
  lessons: AcademyLessonDto[];
  enrollment: {
    id: string;
    status: string;
    progressPercent: number;
    completedAt: string | null;
  } | null;
  completedLessonIds: string[];
  points: number;
};

export type AcademyCourseDetailResponse = {
  course: AcademyCourseDto;
  lessons: AcademyLessonDto[];
};

export type AcademyEnrollmentDto = {
  id: string;
  status: string;
  progressPercent: number;
  completedAt: string | null;
  course: AcademyCourseDto;
};

export type AcademyGamificationBadgeDto = {
  slug: string;
  title: string;
  description: string | null;
  earnedAt: string;
};

export type AcademyGamificationSummaryDto = {
  points: number;
  badges: AcademyGamificationBadgeDto[];
};
