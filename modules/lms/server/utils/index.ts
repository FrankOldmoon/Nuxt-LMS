import type {
  LmsSeries,
  LmsCourseSummary,
  LmsChapterSummary,
  LmsCourseDetail,
  LmsChapterDetail,
  LmsChapterPageData,
  LmsMember,
} from '#lms/types/lms'

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
    orders: (cat.orders as { id: string; label: string; order: number; parentId?: string | null }[]) || [],
  }
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

/** 归一化章节摘要（DB chapters → LmsChapterSummary） */
export function normalizeChapterSummary(ch: any, userChapter?: any): LmsChapterSummary {
  const result: LmsChapterSummary = {
    id: ch.id,
    title: ch.name,
    isOpen: !!ch.isOpen,
  }
  if (userChapter) {
    result.isPass = !!userChapter.isPass
  }
  return result
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

/** 归一化章节详情（DB chapters → LmsChapterDetail） */
export function normalizeChapterDetail(ch: any, userChapter?: any): LmsChapterDetail {
  const result: LmsChapterDetail = {
    id: ch.id,
    title: ch.name,
    content: (ch.content as Record<string, any>) || {},
    questionIds: (ch.questionIds as number[]) || [],
    homeworkIds: (ch.homeworkIds as number[]) || [],
    commentIds: (ch.commentIds as number[]) || [],
  }
  if (userChapter) {
    result.taskStatus = (userChapter.taskStatus as Record<string, boolean>) || {}
    result.isPass = !!userChapter.isPass
    result.record = userChapter.record
  }
  return result
}

/** 归一化章节页面数据（DB chapter + course → LmsChapterPageData） */
export function normalizeChapterPageData(ch: any, course: any, userChapter?: any): LmsChapterPageData {
  const cfg = getConfig(course)
  const courseLms = mergeCourseLmsConfig(cfg)
  return {
    chapter: normalizeChapterDetail(ch, userChapter),
    course: {
      id: course.id,
      title: course.name,
      icon: cfg.icon || 'i-lucide-book-open',
      color: cfg.color || 'primary',
      showDanmaku: courseLms?.course?.showDanmaku ?? true,
      chapterBtns: courseLms?.chapterBtns ?? {},
      courseBtns: courseLms?.courseBtns ?? {},
      ai: courseLms?.ai ?? {},
      chapters: (course.chapters || []).map((ch: any) => normalizeChapterSummary(ch)),
    },
  }
}
