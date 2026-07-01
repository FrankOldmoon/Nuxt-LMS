import type {
  LmsSeries,
  LmsCourseSummary,
  LmsChapterSummary,
  LmsCourseDetail,
  LmsChapterDetail,
  LmsChapterPageData,
} from '#shared/types/lms'

/** 统一响应封装 */
export const cResp = (data: any, msg: string = '', success: boolean = true) => {
  return { data, msg, success }
}

// ====================== 归一化工具：DB 记录 → 前端数据结构 ======================

/** 从 config jsonb 中安全取值 */
function getConfig(course: any): Record<string, any> {
  return (course?.config as Record<string, any>) || {}
}

/** 归一化分类（DB categories → LmsSeries） */
export function normalizeCategory(cat: any): LmsSeries {
  return {
    id: cat.id,
    title: cat.name,
    code: cat.code,
    icon: 'i-lucide-folder',
    order: cat.order ?? 0,
  }
}

/** 归一化课程摘要（DB courses → LmsCourseSummary） */
export function normalizeCourseSummary(course: any, chapterCount?: number): LmsCourseSummary {
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
  }
}

/** 归一化章节摘要（DB chapters → LmsChapterSummary） */
export function normalizeChapterSummary(ch: any): LmsChapterSummary {
  return {
    id: ch.id,
    title: ch.name,
  }
}

/** 归一化课程详情（DB courses + chapters → LmsCourseDetail） */
export function normalizeCourseDetail(course: any): LmsCourseDetail {
  const cfg = getConfig(course)
  const chapters = (course.chapters || []).map(normalizeChapterSummary)
  return {
    id: course.id,
    title: course.name,
    code: course.code,
    icon: cfg.icon || 'i-lucide-book-open',
    color: cfg.color || 'primary',
    level: cfg.level || '入门',
    tags: (course.tags as string[]) || [],
    categoryId: course.categoryId,
    content: (course.content as Record<string, any>) || {},
    chapters,
    orders: (course.orders as { id: string; label: string; order: number; parentId?: string | null }[]) || [],
  }
}

/** 归一化章节详情（DB chapters → LmsChapterDetail） */
export function normalizeChapterDetail(ch: any): LmsChapterDetail {
  return {
    id: ch.id,
    title: ch.name,
    content: (ch.content as Record<string, any>) || {},
  }
}

/** 归一化章节页面数据（DB chapter + course → LmsChapterPageData） */
export function normalizeChapterPageData(ch: any, course: any): LmsChapterPageData {
  const cfg = getConfig(course)
  return {
    chapter: normalizeChapterDetail(ch),
    course: {
      id: course.id,
      title: course.name,
      icon: cfg.icon || 'i-lucide-book-open',
      color: cfg.color || 'primary',
      chapters: (course.chapters || []).map(normalizeChapterSummary),
    },
  }
}
