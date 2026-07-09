/**
 * useCourses composable 测试
 * @see modules/lms/composables/useCourses.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  resetAllStubs,
  setMockFetchHandler,
  clearMockFetchHandler,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  clearMockFetchHandler()
})

describe('composables/useCourses', () => {
  it('初始 courses 为空数组', async () => {
    const { useCourses } = await import('../../composables/useCourses')
    const { courses, courseOptions } = useCourses()
    expect(courses.value).toEqual([])
    expect(courseOptions.value).toEqual([])
  })

  it('loadCourses 加载课程列表', async () => {
    setMockFetchHandler(async (url) => {
      if (url.startsWith('/api/courses/list')) {
        return { data: [{ id: 1, name: 'Math', code: 'M01' }, { id: 2, name: 'Physics', code: 'P01' }], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useCourses } = await import('../../composables/useCourses')
    const { courses, courseOptions, loadCourses } = useCourses()
    await loadCourses()
    expect(courses.value).toHaveLength(2)
    expect(courseOptions.value[0]).toEqual({ label: 'Math', value: 1 })
  })

  it('loadCourses 失败时 courses 为空', async () => {
    setMockFetchHandler(async () => ({ data: null, success: false, msg: 'failed' }))
    const { useCourses } = await import('../../composables/useCourses')
    const { courses, loadCourses } = useCourses()
    await loadCourses()
    expect(courses.value).toEqual([])
  })
})
