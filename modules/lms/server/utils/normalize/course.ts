import type { LmsCourseSummary, LmsCourseDetail, LmsMember } from '#lms/types/lms'

/** 从 config jsonb 中安全取值 */
function getConfig(course: any): Record<string, any> {
  return (course?.config as Record<string, any>) || {}
}

/**
 * 统计「目录」中的章节数：orders 里 id 为数字（指向真实章节）的项，
 * 排除课程首页（id='course'）与自定义块（id 以 custom- 开头）
 */
function countCatalogChapters(orders: any): number {
  if (!Array.isArray(orders)) return 0
  return orders.filter((o) => {
    if (!o || o.id == null) return false
    const id = String(o.id)
    return !id.startsWith('custom-') && !isNaN(Number(id)) && Number(id) > 0
  }).length
}

/** 归一化课程摘要（DB courses → LmsCourseSummary） */
export function normalizeCourseSummary(course: any, chapterCount?: number, teachers: LmsMember[] = []): LmsCourseSummary {
  const cfg = getConfig(course)
  // 章节数优先按目录统计（首页只显示目录里的章节），否则回退调用方传入值/全部章节
  const catalogCount = countCatalogChapters(course.orders)
  return {
    id: course.id,
    title: course.name,
    code: course.code,
    icon: cfg.icon || 'i-lucide-book-open',
    color: cfg.color || 'primary',
    level: cfg.level || '入门',
    tags: (course.tags as string[]) || [],
    categoryId: course.categoryId,
    chapterCount: catalogCount > 0 ? catalogCount : (chapterCount ?? course.chapters?.length ?? 0),
    coverImg: cfg.coverImg || null,
    status: course.status || 'published',
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
    level: cfg.level || 'standard',
    tags: (course.tags as string[]) || [],
    categoryId: course.categoryId,
    coverImg: cfg.coverImg || null,
    content: (course.content as Record<string, any>) || {},
    config: cfg,
    status: course.status || 'published',
    chapters,
    grade_criteria: course.grade_criteria || [],
    orders: (course.orders as { id: string; label: string; order: number; parentId?: string | null }[]) || [],
    teachers: [],
    studentCount: 0,
  }
}
