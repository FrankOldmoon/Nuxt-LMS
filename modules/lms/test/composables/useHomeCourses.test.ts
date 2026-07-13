/**
 * useHomeCourses composable 测试
 * @see modules/lms/composables/useHomeCourses.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import {
  resetAllStubs,
  setMockI18n,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
  // stub useHome（auto-imported），返回可控的 data ref
  const mockHomeData = ref({
    categories: [
      { id: 1, title: 'Cat A', icon: 'i-a', orders: [] },
      { id: 2, title: 'Cat B', icon: 'i-b', orders: [] },
    ],
    courses: [
      { id: 10, title: 'Course 1', categoryId: 1 },
      { id: 11, title: 'Course 2', categoryId: 1 },
      { id: 20, title: 'Course 3', categoryId: 2 },
    ],
  })
  ;(globalThis as any).useHome = () => ({ data: mockHomeData, refresh: () => {} })
  // 保存到全局以便测试中修改
  ;(globalThis as any)._mockHomeData = mockHomeData
})

describe('composables/useHomeCourses', () => {
  it('categories 从 homeData 派生', async () => {
    const { useHomeCourses } = await import('../../composables/useHomeCourses')
    const { categories } = useHomeCourses()
    expect(categories.value).toHaveLength(2)
    expect(categories.value[0].title).toBe('Cat A')
  })

  it('getCoursesByCategory 返回该分类下的课程', async () => {
    const { useHomeCourses } = await import('../../composables/useHomeCourses')
    const { getCoursesByCategory } = useHomeCourses()
    const cat1Courses = getCoursesByCategory(1)
    expect(cat1Courses).toHaveLength(2)
    expect(cat1Courses[0].title).toBe('Course 1')
    const cat2Courses = getCoursesByCategory(2)
    expect(cat2Courses).toHaveLength(1)
    expect(cat2Courses[0].title).toBe('Course 3')
  })

  it('getCoursesByCategory 有 orders 时按 order 排序', async () => {
    const mockHomeData = (globalThis as any)._mockHomeData
    mockHomeData.value.categories[0].orders = [
      { id: '11', label: 'Course 2', order: 0 },
      { id: '10', label: 'Course 1', order: 1 },
    ]
    const { useHomeCourses } = await import('../../composables/useHomeCourses')
    const { getCoursesByCategory } = useHomeCourses()
    const cat1Courses = getCoursesByCategory(1)
    expect(cat1Courses).toHaveLength(2)
    expect(cat1Courses[0].id).toBe(11)
    expect(cat1Courses[1].id).toBe(10)
  })

  it('getCoursesByCategory 有 orders 时过滤不存在的课程', async () => {
    const mockHomeData = (globalThis as any)._mockHomeData
    mockHomeData.value.categories[0].orders = [
      { id: '10', label: 'Course 1', order: 0 },
      { id: '99', label: 'Deleted', order: 1 },
    ]
    const { useHomeCourses } = await import('../../composables/useHomeCourses')
    const { getCoursesByCategory } = useHomeCourses()
    const cat1Courses = getCoursesByCategory(1)
    expect(cat1Courses).toHaveLength(1)
    expect(cat1Courses[0].id).toBe(10)
  })

  it('homeData 为空时 categories 返回空数组', async () => {
    const mockHomeData = (globalThis as any)._mockHomeData
    mockHomeData.value = { categories: [], courses: [] }
    const { useHomeCourses } = await import('../../composables/useHomeCourses')
    const { categories, getCoursesByCategory } = useHomeCourses()
    expect(categories.value).toEqual([])
    expect(getCoursesByCategory(1)).toEqual([])
  })
})
