/**
 * LMS 前端数据类型定义
 * 这些类型对应 API 返回的归一化数据结构
 */

/** 课程系列（对应 DB categories 表） */
export interface LmsSeries {
  id: number
  title: string
  code: string | null
  icon: string
  order: number
}

/** 课程摘要（列表用，不含章节数据） */
export interface LmsCourseSummary {
  id: number
  title: string
  code: string | null
  icon: string
  color: string
  level: string
  tags: string[]
  categoryId: number
  chapterCount: number
}

/** 章节摘要（列表用） */
export interface LmsChapterSummary {
  id: number
  title: string
}

/** UEditor 文档 JSON 类型 */
export type UEditorContent = Record<string, any>

/** 课程详情（含完整章节列表 + 富文本内容） */
export interface LmsCourseDetail extends Omit<LmsCourseSummary, 'chapterCount'> {
  content: UEditorContent
  chapters: LmsChapterSummary[]
  /** 导航排序配置（来自 courses 表的 orders 字段） */
  orders: { id: string; label: string; order: number; parentId?: string | null }[]
}

/** 章节详情 */
export interface LmsChapterDetail {
  id: number
  title: string
  content: UEditorContent
}

/** 章节页面数据（章节 + 所属课程含章节列表用于导航） */
export interface LmsChapterPageData {
  chapter: LmsChapterDetail
  course: {
    id: number
    title: string
    icon: string
    color: string
    chapters: LmsChapterSummary[]
  }
}

/** 首页数据（分类 + 课程列表） */
export interface LmsHomeData {
  categories: LmsSeries[]
  courses: LmsCourseSummary[]
}
