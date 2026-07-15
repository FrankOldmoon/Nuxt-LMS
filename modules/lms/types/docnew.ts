/**
 * LMS frontend data type definitions
 * These types correspond to the normalized data structures returned by the API
 */

/** Course series (corresponds to the DB categories table) */
export interface LmsSeries {
  id: number
  title: string
  code: string | null
  icon: string
  order: number
  /** Navigation ordering config (from the orders field of the categories table) */
  orders: { id: string; label: string; order: number; parentId?: string | null }[]
}

/** Course summary (for list views, excludes chapter data) */
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

/** Chapter summary (for list views) */
export interface LmsChapterSummary {
  id: number
  title: string
  accessible?: boolean
  /** Whether the chapter is open by default */
  isOpen?: boolean
  /** Whether the current user has completed all tasks in this chapter (is_pass) */
  isPass?: boolean
}

/** UEditor document JSON type */
export type UEditorContent = Record<string, any>

/** Course detail (includes full chapter list + rich text content) */
export interface LmsCourseDetail extends Omit<LmsCourseSummary, 'chapterCount'> {
  content: UEditorContent
  /** Course grading criteria */
  grade_criteria: [],
  config: Record<string, any>
  chapters: LmsChapterSummary[]
  /** Navigation ordering config (from the orders field of the courses table) */
  orders: { id: string; label: string; order: number; parentId?: string | null }[]
  teachers: LmsMember[]
  studentCount: number
}

/** Chapter detail */
export interface LmsChapterDetail {
  id: number
  title: string
  content: UEditorContent
  questionIds?: number[]
  homeworkIds?: number[]
  commentIds?: number[]
  isOpen?: boolean
  classChapters?: { classId: number; open: boolean }[]
  /** Completion status per heading: { [headingId]: boolean } */
  taskStatus?: Record<string, boolean>
  /** Whether the current user has completed all tasks in this chapter */
  isPass?: boolean
  /** User chapter record (tiptap JSON, AI-generated content + user edits) */
  record?: any
}

/** Chapter page data (chapter + parent course with chapter list for navigation) */
export interface LmsChapterPageData {
  chapter: LmsChapterDetail
  course: {
    id: number
    title: string
    icon: string
    color: string
    showDanmaku: boolean
    /** Chapter button toggle config */
    chapterBtns?: Record<string, boolean>
    /** Course button toggle config */
    courseBtns?: Record<string, boolean>
    /** AI assistant config (merged from global + course-level) */
    ai?: Record<string, any>
    chapters: LmsChapterSummary[]
  }
}

/** Homepage data (categories + course list) */
export interface LmsHomeData {
  categories: LmsSeries[]
  courses: LmsCourseSummary[]
}

/** Class (corresponds to the DB classes table) */
export interface LmsClass {
  id: number
  name: string
  code: string
}

/** Course member (teacher / editor) */
export interface LmsMember {
  userId: number
  username: string
  name: string
  avatarImg: string | null
  isTeacher: boolean
  isEditor: boolean
}

/** User search result */
export interface LmsSearchUser {
  id: number
  username: string
  name: string
  avatarImg: string | null
}

/** Class user (class member list) */
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

/** User profile formData */
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

/** Notification */
export interface LmsNotification {
  id: number
  name: string
  content: Record<string, any> | null
  data: Record<string, any> | null
  userId: number
  readAt: string | null
  createdAt: string
}

/** Paginated notification list data */
export interface LmsNotificationList {
  items: LmsNotification[]
  total: number
  page: number
  pageSize: number
}
