/**
 * useLmsCourseDetail composable 测试
 * @see modules/lms/composables/useLmsCourseDetail.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { ref, computed } from 'vue'
import {
  resetAllStubs,
  setMockI18n,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
  // stub useCourseDetailPage（auto-imported）
  ;(globalThis as any).useCourseDetailPage = (_courseId: any, _apiUrl: any) => ({
    course: ref<any>(null),
    chapterTree: ref<any[]>([]),
    firstChapterUrl: computed(() => undefined),
    canEdit: ref(false),
    hasContent: ref(false),
    pending: ref(false),
    refresh: async () => {},
  })
})

describe('composables/useLmsCourseDetail', () => {
  it('chapterTree 扩展 accessible/isOpen/isPass 字段', async () => {
    const baseCourse = {
      id: 1,
      chapters: [
        { id: 1, accessible: false, isOpen: false, isPass: false },
        { id: 2, accessible: true, isOpen: true, isPass: true },
      ],
    }
    const baseChapterTree = [
      { id: 1, label: 'Ch1', to: '/course/1/1' },
      { id: 2, label: 'Ch2', to: '/course/1/2' },
    ]
    ;(globalThis as any).useCourseDetailPage = () => ({
      course: ref(baseCourse),
      chapterTree: ref(baseChapterTree),
      firstChapterUrl: computed(() => undefined),
      canEdit: ref(false),
      hasContent: ref(false),
      pending: ref(false),
      refresh: async () => {},
    })
    const { useLmsCourseDetail } = await import('../../composables/useLmsCourseDetail')
    const courseId = computed(() => '1')
    const apiUrl = computed(() => '/api/courses/show?id=1')
    const { chapterTree } = useLmsCourseDetail(courseId, apiUrl)
    expect(chapterTree.value).toHaveLength(2)
    expect(chapterTree.value[0].accessible).toBe(false)
    expect(chapterTree.value[0].isOpen).toBe(false)
    expect(chapterTree.value[0].isPass).toBe(false)
    expect(chapterTree.value[1].accessible).toBe(true)
    expect(chapterTree.value[1].isPass).toBe(true)
  })

  it('firstChapterUrl 排除不可访问的章节', async () => {
    const baseCourse = {
      id: 1,
      chapters: [
        { id: 1, accessible: false },
        { id: 2, accessible: true },
      ],
    }
    const baseChapterTree = [
      { id: 1, label: 'Ch1', to: '/course/1/1' },
      { id: 2, label: 'Ch2', to: '/course/1/2' },
    ]
    ;(globalThis as any).useCourseDetailPage = () => ({
      course: ref(baseCourse),
      chapterTree: ref(baseChapterTree),
      firstChapterUrl: computed(() => undefined),
      canEdit: ref(false),
      hasContent: ref(false),
      pending: ref(false),
      refresh: async () => {},
    })
    const { useLmsCourseDetail } = await import('../../composables/useLmsCourseDetail')
    const courseId = computed(() => '1')
    const apiUrl = computed(() => '/api/courses/show?id=1')
    const { firstChapterUrl } = useLmsCourseDetail(courseId, apiUrl)
    expect(firstChapterUrl.value).toBe('/course/1/2')
  })

  it('firstChapterUrl 排除含 # 的链接', async () => {
    const baseCourse = {
      id: 1,
      chapters: [
        { id: 1, accessible: true },
        { id: 2, accessible: true },
      ],
    }
    const baseChapterTree = [
      { id: 'custom-1', label: 'Custom', to: '/course/1#Custom' },
      { id: 2, label: 'Ch2', to: '/course/1/2' },
    ]
    ;(globalThis as any).useCourseDetailPage = () => ({
      course: ref(baseCourse),
      chapterTree: ref(baseChapterTree),
      firstChapterUrl: computed(() => undefined),
      canEdit: ref(false),
      hasContent: ref(false),
      pending: ref(false),
      refresh: async () => {},
    })
    const { useLmsCourseDetail } = await import('../../composables/useLmsCourseDetail')
    const courseId = computed(() => '1')
    const apiUrl = computed(() => '/api/courses/show?id=1')
    const { firstChapterUrl } = useLmsCourseDetail(courseId, apiUrl)
    expect(firstChapterUrl.value).toBe('/course/1/2')
  })

  it('progressPercent 计算已通过章节百分比', async () => {
    const baseCourse = {
      id: 1,
      chapters: [
        { id: 1, isPass: true },
        { id: 2, isPass: true },
        { id: 3, isPass: false },
        { id: 4, isPass: false },
      ],
    }
    ;(globalThis as any).useCourseDetailPage = () => ({
      course: ref(baseCourse),
      chapterTree: ref([]),
      firstChapterUrl: computed(() => undefined),
      canEdit: ref(false),
      hasContent: ref(false),
      pending: ref(false),
      refresh: async () => {},
    })
    const { useLmsCourseDetail } = await import('../../composables/useLmsCourseDetail')
    const courseId = computed(() => '1')
    const apiUrl = computed(() => '/api/courses/show?id=1')
    const { progressPercent } = useLmsCourseDetail(courseId, apiUrl)
    expect(progressPercent.value).toBe(50) // 2/4 = 50%
  })

  it('progressPercent 无章节时返回 null', async () => {
    ;(globalThis as any).useCourseDetailPage = () => ({
      course: ref({ id: 1, chapters: [] }),
      chapterTree: ref([]),
      firstChapterUrl: computed(() => undefined),
      canEdit: ref(false),
      hasContent: ref(false),
      pending: ref(false),
      refresh: async () => {},
    })
    const { useLmsCourseDetail } = await import('../../composables/useLmsCourseDetail')
    const courseId = computed(() => '1')
    const apiUrl = computed(() => '/api/courses/show?id=1')
    const { progressPercent } = useLmsCourseDetail(courseId, apiUrl)
    expect(progressPercent.value).toBeNull()
  })

  it('progressPercent 全部通过时返回 100', async () => {
    ;(globalThis as any).useCourseDetailPage = () => ({
      course: ref({
        id: 1,
        chapters: [
          { id: 1, isPass: true },
          { id: 2, isPass: true },
        ],
      }),
      chapterTree: ref([]),
      firstChapterUrl: computed(() => undefined),
      canEdit: ref(false),
      hasContent: ref(false),
      pending: ref(false),
      refresh: async () => {},
    })
    const { useLmsCourseDetail } = await import('../../composables/useLmsCourseDetail')
    const courseId = computed(() => '1')
    const apiUrl = computed(() => '/api/courses/show?id=1')
    const { progressPercent } = useLmsCourseDetail(courseId, apiUrl)
    expect(progressPercent.value).toBe(100)
  })
})
