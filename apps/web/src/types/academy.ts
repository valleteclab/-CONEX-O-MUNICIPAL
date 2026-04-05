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
