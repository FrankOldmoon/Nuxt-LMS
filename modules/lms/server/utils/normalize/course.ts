import type { LmsCourseSummary, LmsCourseDetail, LmsMember } from '#lms/types/lms'

/** 从 config jsonb 中安全取值 */
function getConfig(course: any): Record<string, any> {
  return (course?.config as Record<string, any>) || {}
}

/** 归一化课程摘要（DB courses → LmsCourseSummary） */
export function normalizeCourseSummary(course: any, chapterCount?: number, teachers: LmsMember[] = []): LmsCourseSummary {
  const cfg = getConfig(course)
  return {
    id: course.id,
    title: course.name,
    code: course.code,
    icon: cfg.icon || 'i-lucide-book-open',
    color: cfg.color || 'primary',
    level: cfg.level || '入门',
    tags: (course.tags as string[]) || [],
    categoryId: course.categoryId,
    chapterCount: chapterCount ?? course.chapters?.length ?? 0,
    coverImg: cfg.coverImg || null,
    teachers,
  }
}

/** 归一化课程详情（DB courses + chapters → LmsCourseDetail） */
export function normalizeCourseDetail(course: any): LmsCourseDetail {
  const cfg = getConfig(course)
  const chapters = (course.chapters || []).map((ch: any) => normalizeChapterSummary(ch))
  return {
    id: course.id,
    title: course.name,
    code: course.code,
    icon: cfg.icon || 'i-lucide-book-open',
    color: cfg.color || 'primary',
    level: cfg.level || '入门',
    tags: (course.tags as string[]) || [],
    categoryId: course.categoryId,
    coverImg: cfg.coverImg || null,
    content: (course.content as Record<string, any>) || {},
    config: cfg,
    chapters,
    orders: (course.orders as { id: string; label: string; order: number; parentId?: string | null }[]) || [],
    teachers: [],
    studentCount: 0,
  }
}
