/**
 * home/courseSection.vue component test
 * @see modules/lms/components/home/courseSection.vue
 *
 * Home course section: series title + course card grid/list.
 * Depends on useAuthLms().isCourseTeacher for highlight, imports real composable in tests.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n, setMockAuthUser } from '../../../../../test/setup/nuxt-stubs'
import { useAuthLms } from '../../../composables/useAuthLms'

;(globalThis as any).useAuthLms = useAuthLms

beforeEach(() => {
  resetAllStubs()
  setMockI18n({
    locale: { value: 'en' },
    t: (k: string, params?: any) => {
      if (params) {
        let s = k
        for (const [kk, v] of Object.entries(params)) s = s.replace(`{${kk}}`, String(v))
        return s
      }
      return k
    },
    d: (v: any) => String(v),
  })
  setMockAuthUser({ id: 1, name: 'user' }, [], [])
})

const _globalStubs = {
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  CourseCard: {
    template: '<div class="course-card" :data-id="course.id" :data-highlight="highlight">{{ course.title }}</div>',
    props: ['course', 'highlight'],
  },
}

const _globalConfig = {
  mocks: {
    $t: (k: string, params?: any) => {
      if (params) {
        let s = k
        for (const [kk, v] of Object.entries(params)) s = s.replace(`{${kk}}`, String(v))
        return s
      }
      return k
    },
  },
  stubs: _globalStubs,
}

describe('home/courseSection.vue', () => {
  const sampleSection = { id: 's1', title: '前端系列', icon: 'i-lucide-code' }
  const sampleCourses = [
    { id: 1, title: 'Vue 基础' },
    { id: 2, title: 'React 入门' },
    { id: 3, title: 'Angular 实战' },
  ]

  it('渲染系列标题与图标', async () => {
    const { default: CourseSection } = await import('../../../components/home/courseSection.vue')
    const wrapper = mount(CourseSection, {
      props: { section: sampleSection, courses: sampleCourses },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('前端系列')
  })

  it('渲染所有课程卡片（grid 默认模式）', async () => {
    const { default: CourseSection } = await import('../../../components/home/courseSection.vue')
    const wrapper = mount(CourseSection, {
      props: { section: sampleSection, courses: sampleCourses },
      global: _globalConfig,
    })
    expect(wrapper.findAll('.course-card').length).toBe(3)
  })

  it('viewMode=list 时渲染列表模式', async () => {
    const { default: CourseSection } = await import('../../../components/home/courseSection.vue')
    const wrapper = mount(CourseSection, {
      props: { section: sampleSection, courses: sampleCourses, viewMode: 'list' },
      global: _globalConfig,
    })
    expect(wrapper.findAll('.course-card').length).toBe(3)
  })

  it('courses 为空时不渲染卡片', async () => {
    const { default: CourseSection } = await import('../../../components/home/courseSection.vue')
    const wrapper = mount(CourseSection, {
      props: { section: sampleSection, courses: [] },
      global: _globalConfig,
    })
    expect(wrapper.findAll('.course-card').length).toBe(0)
  })

  it('教师课程 highlight=true', async () => {
    setMockAuthUser({ id: 1, name: 'teacher' }, [{ code: 'teacher' }], [], { teacherCourseIds: [1] })
    const { default: CourseSection } = await import('../../../components/home/courseSection.vue')
    const wrapper = mount(CourseSection, {
      props: { section: sampleSection, courses: sampleCourses },
      global: _globalConfig,
    })
    const cards = wrapper.findAll('.course-card')
    expect(cards[0].attributes('data-highlight')).toBe('true')
    expect(cards[1].attributes('data-highlight')).toBe('false')
  })

  it('section.id 作为根元素 id', async () => {
    const { default: CourseSection } = await import('../../../components/home/courseSection.vue')
    const wrapper = mount(CourseSection, {
      props: { section: sampleSection, courses: sampleCourses },
      global: _globalConfig,
    })
    expect(wrapper.attributes('id')).toBe('s1')
  })

  it('显示课程数量文案', async () => {
    const { default: CourseSection } = await import('../../../components/home/courseSection.vue')
    const wrapper = mount(CourseSection, {
      props: { section: sampleSection, courses: sampleCourses },
      global: _globalConfig,
    })
    // home.courses key contains count=3
    expect(wrapper.text()).toContain('home.courses')
  })
})
