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
  /** 导航排序配置（来自 categories 表的 orders 字段） */
  orders: { id: string; label: string; order: number; parentId?: string | null }[]
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
  coverImg: string | null
  teachers: LmsMember[]
}

/** 章节摘要（列表用） */
export interface LmsChapterSummary {
  id: number
  title: string
  accessible?: boolean
  /** 章节是否默认开放 */
  isOpen?: boolean
  /** 当前用户是否已完成本章全部任务（is_pass） */
  isPass?: boolean
}

/** UEditor 文档 JSON 类型 */
export type UEditorContent = Record<string, any>

/** 课程详情（含完整章节列表 + 富文本内容） */
export interface LmsCourseDetail extends Omit<LmsCourseSummary, 'chapterCount'> {
  content: UEditorContent
  config: Record<string, any>
  chapters: LmsChapterSummary[]
  /** 导航排序配置（来自 courses 表的 orders 字段） */
  orders: { id: string; label: string; order: number; parentId?: string | null }[]
  teachers: LmsMember[]
  studentCount: number
}

/** 章节详情 */
export interface LmsChapterDetail {
  id: number
  title: string
  content: UEditorContent
  questionIds?: number[]
  homeworkIds?: number[]
  commentIds?: number[]
  isOpen?: boolean
  classChapters?: { classId: number; open: boolean }[]
  /** 各 heading 的完成状态：{ [headingId]: boolean } */
  taskStatus?: Record<string, boolean>
  /** 当前用户是否已完成本章全部任务 */
  isPass?: boolean
}

/** 章节页面数据（章节 + 所属课程含章节列表用于导航） */
export interface LmsChapterPageData {
  chapter: LmsChapterDetail
  course: {
    id: number
    title: string
    icon: string
    color: string
    showDanmaku: boolean
    /** 章节按钮开关配置 */
    chapterBtns?: Record<string, boolean>
    /** 课程按钮开关配置 */
    courseBtns?: Record<string, boolean>
    chapters: LmsChapterSummary[]
  }
}

/** 首页数据（分类 + 课程列表） */
export interface LmsHomeData {
  categories: LmsSeries[]
  courses: LmsCourseSummary[]
}

/** 班级（对应 DB classes 表） */
export interface LmsClass {
  id: number
  name: string
  code: string
}

/** 课程成员（教师/编辑者） */
export interface LmsMember {
  userId: number
  username: string
  name: string
  avatarImg: string | null
  isTeacher: boolean
  isEditor: boolean
}

/** 用户搜索结果 */
export interface LmsSearchUser {
  id: number
  username: string
  name: string
  avatarImg: string | null
}

/** 班级用户（班级成员列表） */
export interface LmsClassUser {
  id: number
  username: string
  name: string
  preferName: string | null
  englishName: string | null
  avatarImg: string | null
  rollNumber: string | null
  email: string | null
  telephone: string | null
  isTeacher: boolean | null
}

/** 用户资料表单数据 */
export interface UserProfileForm {
  name: string
  preferName: string
  englishName: string
  email: string
  gender: string
  avatarImg: string
  rollNumber: string
  telephone: string
  classId: number | null
}

/** 通知 */
export interface LmsNotification {
  id: number
  name: string
  content: Record<string, any> | null
  data: Record<string, any> | null
  userId: number
  readAt: string | null
  createdAt: string
}

/** 通知列表分页数据 */
export interface LmsNotificationList {
  items: LmsNotification[]
  total: number
  page: number
  pageSize: number
}
