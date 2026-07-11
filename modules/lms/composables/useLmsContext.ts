import type { InjectionKey, Ref } from 'vue'

/**
 * 课程/章节上下文（替代旧的 editableCourseId / editableCourseId 全局 useState）
 *
 * 设计：
 * - 页面级 provide：章节页 provide course+chapter id，课程页只 provide course id
 * - 子组件 useLmsContext() 注入，回退到 route.params.id / route.params.cid
 * - provide/inject 沿组件实例树解析，可穿透 <Teleport>（UModal 弹窗内组件仍能注入）
 * - 带 props.courseId 覆盖的组件（如 admin 复用）用 provideLmsCourseId 把 effectiveCourseId
 *   重新 provide 给子树，替代旧的 setEditableMeta 临时设置/还原机制
 */
export const LMS_COURSE_ID: InjectionKey<Ref<number>> = Symbol('lms-course-id')
export const LMS_CHAPTER_ID: InjectionKey<Ref<number>> = Symbol('lms-chapter-id')

/** 页面级 provide：章节页传 chapterId，课程页省略 */
export function provideLmsContext(courseId: Ref<string | number>, chapterId?: Ref<string | number>) {
  provide(LMS_COURSE_ID, computed(() => Number(courseId.value) || 0))
  if (chapterId) provide(LMS_CHAPTER_ID, computed(() => Number(chapterId.value) || 0))
}

/** 单独 provide course id（带 props.courseId 覆盖的组件用，覆盖子树） */
export function provideLmsCourseId(courseId: Ref<number>) {
  provide(LMS_COURSE_ID, courseId)
}

/** 注入上下文，无 provider 时回退到 route 参数 */
export function useLmsContext() {
  const route = useRoute()
  const injCourse = inject(LMS_COURSE_ID, null)
  const injChapter = inject(LMS_CHAPTER_ID, null)
  const courseId = computed(() => (injCourse ? injCourse.value : (route.params.id ? Number(route.params.id) : 0)))
  const chapterId = computed(() => (injChapter ? injChapter.value : (route.params.cid ? Number(route.params.cid) : 0)))
  return { courseId, chapterId }
}
