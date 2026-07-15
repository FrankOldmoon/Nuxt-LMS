import type { LmsCourseSummary, LmsCourseDetail, LmsMember } from '#lms/types/lms'

/** Safely get value from config jsonb */
function getConfig(course: any): Record<string, any> {
  return (course?.config as Record<string, any>) || {}
}

/** Normalize course summary (DB courses -> LmsCourseSummary) */
export function normalizeCourseSummary(course: any, chapterCount?: number, teachers: LmsMember[] = []): LmsCourseSummary {
  const cfg = getConfig(course)
  return {
    id: course.id,
    title: course.name,
    code: course.code,
    icon: cfg.icon || 'i-lucide-book-open',
    color: cfg.color || 'primary',
    level: cfg.level || 'beginner',
    tags: (course.tags as string[]) || [],
    categoryId: course.categoryId,
    chapterCount: chapterCount ?? course.chapters?.length ?? 0,
    coverImg: cfg.coverImg || null,
    teachers,
  }
}

/** Normalize course detail (DB courses + chapters -> LmsCourseDetail) */
export function normalizeCourseDetail(course: any): LmsCourseDetail {
  const cfg = getConfig(course)
  const chapters = (course.chapters || []).map((ch: any) => normalizeChapterSummary(ch))
  return {
    id: course.id,
    title: course.name,
    code: course.code,
    icon: cfg.icon || 'i-lucide-book-open',
    color: cfg.color || 'primary',
    level: cfg.level || 'standard',
    tags: (course.tags as string[]) || [],
    categoryId: course.categoryId,
    coverImg: cfg.coverImg || null,
    content: (course.content as Record<string, any>) || {},
    config: cfg,
    chapters,
    grade_criteria: course.grade_criteria || [],
    orders: (course.orders as { id: string; label: string; order: number; parentId?: string | null }[]) || [],
    teachers: [],
    studentCount: 0,
  }
}
