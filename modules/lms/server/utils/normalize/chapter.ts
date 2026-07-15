import type { LmsChapterDetail, LmsChapterPageData } from '#lms/types/lms'
import { normalizeChapterSummary } from './category'
import { mergeCourseLmsConfig } from '../lmsConfig/cache/course-merge'

/** Normalize chapter detail (DB chapters -> LmsChapterDetail) */
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

/** Normalize chapter page data (DB chapter + course -> LmsChapterPageData) */
export function normalizeChapterPageData(ch: any, course: any, userChapter?: any): LmsChapterPageData {
  const cfg = (course?.config as Record<string, any>) || {}
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
      chapters: (course.chapters || []).map((chapterRow: any) => normalizeChapterSummary(chapterRow)),
    },
  }
}
