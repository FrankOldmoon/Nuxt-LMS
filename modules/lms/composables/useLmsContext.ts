import type { InjectionKey, Ref } from 'vue'

/**
 * Course/chapter context (replaces the old editableCourseId / editableCourseId global useState)
 *
 * Design:
 * - Page-level provide: chapter page provides course+chapter id, course page only provides course id
 * - Child components use useLmsContext() to inject, fallback to route.params.id / route.params.cid
 * - provide/inject resolves along the component instance tree, can pass through <Teleport> (components inside UModal modal can still inject)
 * - Components with props.courseId override (e.g. admin reuse) use provideLmsCourseId to re-provide
 *   effectiveCourseId to the subtree, replacing the old setEditableMeta temporary set/restore mechanism
 */
export const LMS_COURSE_ID: InjectionKey<Ref<number>> = Symbol('lms-course-id')
export const LMS_CHAPTER_ID: InjectionKey<Ref<number>> = Symbol('lms-chapter-id')

/** Page-level provide: chapter page passes chapterId, course page omits */
export function provideLmsContext(courseId: Ref<string | number>, chapterId?: Ref<string | number>) {
  provide(LMS_COURSE_ID, computed(() => Number(courseId.value) || 0))
  if (chapterId) provide(LMS_CHAPTER_ID, computed(() => Number(chapterId.value) || 0))
}

/** Separately provide course id (for components with props.courseId override, overrides subtree) */
export function provideLmsCourseId(courseId: Ref<number>) {
  provide(LMS_COURSE_ID, courseId)
}

/** Inject context, fallback to route params when no provider */
export function useLmsContext() {
  const route = useRoute()
  const injCourse = inject(LMS_COURSE_ID, null)
  const injChapter = inject(LMS_CHAPTER_ID, null)
  const courseId = computed(() => (injCourse ? injCourse.value : (route.params.id ? Number(route.params.id) : 0)))
  const chapterId = computed(() => (injChapter ? injChapter.value : (route.params.cid ? Number(route.params.cid) : 0)))
  return { courseId, chapterId }
}
