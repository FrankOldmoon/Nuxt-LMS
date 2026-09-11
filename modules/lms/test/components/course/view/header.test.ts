/**
 * course/view/header.vue 组件测试
 * @see modules/lms/components/course/view/header.vue
 *
 * 课程头部：封面 + 标题 + 标签 + 教师 + 开始学习按钮
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n, setMockLayoutState } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  // header.vue 通过 useLayoutState 读取 courseBtnsConfig.showShop 控制商店按钮显隐
  setMockLayoutState({ courseBtnsConfig: { showShop: true } })
  setMockI18n({ locale: { value: 'en' }, t: (k: string, params?: any) => {
    if (params) {
      let s = k
      for (const [kk, v] of Object.entries(params)) s = s.replace(`{${kk}}`, String(v))
      return s
    }
    return k
  } })
})

const _globalStubs = {
  UBadge: {
    template: '<span class="ubadge">{{ label }}<slot /></span>',
    props: ['label', 'color', 'variant', 'size'],
  },
  UButton: {
    template: '<button class="ubutton" :data-loading="loading" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>',
    props: ['label', 'icon', 'color', 'size', 'loading', 'variant'],
  },
  UTooltip: { template: '<span class="utooltip"><slot /></span>', props: ['text'] },
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  CourseEditor: { template: '<div class="course-editor" />', props: ['courseId'] },
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
  config: {
    globalProperties: {
      levelColor: (l: string) => {
        const map: Record<string, string> = {
          beginner: 'success',
          intermediate: 'warning',
          advanced: 'error',
        }
        return map[l] || 'neutral'
      },
    },
  },
}

describe('course/view/header.vue', () => {
  const sampleCourse = {
    id: 1,
    title: 'Vue 基础',
    coverImg: 'https://example.com/cover.jpg',
    level: 'beginner',
    chapters: [{ id: 1 }, { id: 2 }],
    tags: ['前端', 'Vue'],
    teachers: [{ userId: 1, name: '张老师', avatarImg: 'a.jpg' }],
  }

  it('渲染课程标题', async () => {
    const { default: ViewHeader } = await import('../../../../components/course/view/header.vue')
    const wrapper = mount(ViewHeader, {
      props: { course: sampleCourse, canEdit: false, courseId: '1', exporting: false },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('Vue 基础')
  })

  it('渲染封面图', async () => {
    const { default: ViewHeader } = await import('../../../../components/course/view/header.vue')
    const wrapper = mount(ViewHeader, {
      props: { course: sampleCourse, canEdit: false, courseId: '1', exporting: false },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.html()).toContain('https://example.com/cover.jpg')
  })

  it('无封面图时使用占位图', async () => {
    const { default: ViewHeader } = await import('../../../../components/course/view/header.vue')
    const wrapper = mount(ViewHeader, {
      props: { course: { ...sampleCourse, coverImg: null }, canEdit: false, courseId: '1', exporting: false },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.html()).toContain('picsum.photos')
  })

  it('渲染标签', async () => {
    const { default: ViewHeader } = await import('../../../../components/course/view/header.vue')
    const wrapper = mount(ViewHeader, {
      props: { course: sampleCourse, canEdit: false, courseId: '1', exporting: false },
      global: _globalConfig,
    })
    await flushPromises()
    const badges = wrapper.findAll('.ubadge')
    expect(badges.length).toBeGreaterThanOrEqual(2)
  })

  it('canEdit=true 时渲染编辑和导出按钮', async () => {
    const { default: ViewHeader } = await import('../../../../components/course/view/header.vue')
    const wrapper = mount(ViewHeader, {
      props: { course: sampleCourse, canEdit: true, courseId: '1', exporting: false, firstChapterUrl: '/c/1/1' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.course-editor').exists()).toBe(true)
  })

  it('firstChapterUrl 存在时渲染开始学习按钮', async () => {
    const { default: ViewHeader } = await import('../../../../components/course/view/header.vue')
    const wrapper = mount(ViewHeader, {
      props: { course: sampleCourse, canEdit: false, courseId: '1', exporting: false, firstChapterUrl: '/course/1/1' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('course.startLearning')
  })

  it('点击导出按钮 emit export 事件', async () => {
    const { default: ViewHeader } = await import('../../../../components/course/view/header.vue')
    const wrapper = mount(ViewHeader, {
      props: { course: sampleCourse, canEdit: true, courseId: '1', exporting: false, firstChapterUrl: '/c/1/1' },
      global: _globalConfig,
    })
    await flushPromises()
    // 导出按钮在 UTooltip 内，是第一个 .ubutton（CourseEditor 被 stub 为无按钮的 div）
    const exportBtn = wrapper.find('.utooltip .ubutton')
    expect(exportBtn.exists()).toBe(true)
    await exportBtn.trigger('click')
    expect(wrapper.emitted('export')).toBeTruthy()
  })

  it('渲染教师列表', async () => {
    const { default: ViewHeader } = await import('../../../../components/course/view/header.vue')
    const wrapper = mount(ViewHeader, {
      props: { course: sampleCourse, canEdit: false, courseId: '1', exporting: false },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('张老师')
  })
})
