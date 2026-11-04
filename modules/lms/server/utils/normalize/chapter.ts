import type { LmsChapterDetail, LmsChapterPageData } from '#lms/types/lms'
import { normalizeChapterSummary } from './category'
import { mergeCourseLmsConfig } from '../lmsConfig/cache/course-merge'

/**
 * ai 字段白名单：llmApiKey / llmApiUrl 仅服务端 chat 代理使用，绝不下发前端
 * （与 /api/config/lms-public 的公开 ai 字段保持一致）
 */
const AI_PUBLIC_KEYS = [
  'enabled', 'chatEnabled', 'mode', 'model', 'thinking', 'apiUrl',
  'ollamaUrl', 'ollamaModel', 'title', 'preset', 'opening', 'ttsGender',
] as const

function sanitizeAi(ai: any): Record<string, any> {
  const out: Record<string, any> = {}
  if (ai && typeof ai === 'object') {
    for (const key of AI_PUBLIC_KEYS) {
      if (ai[key] !== undefined) out[key] = ai[key]
    }
  }
  return out
}

/** 归一化章节详情（DB chapters → LmsChapterDetail） */
export function normalizeChapterDetail(ch: any, userChapter?: any): LmsChapterDetail {  const result: LmsChapterDetail = {
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
      ai: sanitizeAi(courseLms?.ai),
      chapters: (course.chapters || []).map((chapterRow: any) => normalizeChapterSummary(chapterRow)),
    },
  }
}
