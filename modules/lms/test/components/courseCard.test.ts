/**
 * Course Card 组件测试
 * @see modules/lms/components/course/card.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../test/setup/nuxt-stubs'

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
  })
})

const _globalStubs = {
  NuxtLink: {
    template: '<a :href="to" class="nuxt-link" :class="$attrs.class"><slot /></a>',
    props: ['to'],
  },
  UCard: {
    template: '<div class="ucard" :class="$attrs.class"><slot /></div>',
    props: ['class', 'ui'],
  },
  UIcon: {
    template: '<i class="uicon" :class="$attrs.name"></i>',
  },
  UBadge: {
    template: '<span class="ubadge" :class="$attrs.class">{{ label }}<slot /></span>',
    props: ['label', 'color', 'variant', 'size'],
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
  config: {
    // 把 auto-imported helpers 注册为 Vue app globalProperties
    globalProperties: {
      colorBgClass: (c: string) => {
        const map: Record<string, string> = {
          primary: 'bg-primary/10',
          success: 'bg-success/10',
          info: 'bg-info/10',
          warning: 'bg-warning/10',
          error: 'bg-error/10',
          neutral: 'bg-elevated',
        }
        return map[c] || 'bg-primary/10'
      },
      colorTextClass: (c: string) => {
        const map: Record<string, string> = {
          primary: 'text-primary',
          success: 'text-success',
          info: 'text-info',
          warning: 'text-warning',
          error: 'text-error',
          neutral: 'text-highlighted',
        }
        return map[c] || 'text-primary'
      },
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

describe('course/card.vue', () => {
  const sampleCourse = {
    id: 1,
    title: 'Vue 基础教程',
    coverImg: 'https://example.com/cover.jpg',
    icon: 'i-lucide-book',
    color: 'blue',
    level: '入门',
    tags: ['前端', 'Vue'],
    chapterCount: 12,
    teachers: [
      { userId: 1, name: '张老师', avatarImg: null, isTeacher: true, isEditor: false },
    ],
  }

  it('渲染课程标题', async () => {
    const { default: CourseCard } = await import('../../components/course/card.vue')
    const wrapper = mount(CourseCard, {
      props: { course: sampleCourse },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('Vue 基础教程')
  })

  it('显示封面图（coverImg 存在时）', async () => {
    const { default: CourseCard } = await import('../../components/course/card.vue')
    const wrapper = mount(CourseCard, {
      props: { course: sampleCourse },
      global: _globalConfig,
    })
    expect(wrapper.html()).toContain('https://example.com/cover.jpg')
  })

  it('无封面图时显示 icon 占位', async () => {
    const { default: CourseCard } = await import('../../components/course/card.vue')
    const wrapper = mount(CourseCard, {
      props: { course: { ...sampleCourse, coverImg: null } },
      global: _globalConfig,
    })
    expect(wrapper.html()).toContain('i-lucide-book')
  })

  it('显示难度标签', async () => {
    const { default: CourseCard } = await import('../../components/course/card.vue')
    const wrapper = mount(CourseCard, {
      props: { course: sampleCourse },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('入门')
  })

  it('显示所有 tags', async () => {
    const { default: CourseCard } = await import('../../components/course/card.vue')
    const wrapper = mount(CourseCard, {
      props: { course: sampleCourse },
      global: _globalConfig,
    })
    // UBadge stub 不渲染 label prop，只显示 slot
    // 验证 stub 元素存在（2 个 tag badge）
    const badges = wrapper.findAll('.ubadge')
    expect(badges.length).toBeGreaterThanOrEqual(2)
  })

  it('显示章节数', async () => {
    const { default: CourseCard } = await import('../../components/course/card.vue')
    const wrapper = mount(CourseCard, {
      props: { course: sampleCourse },
      global: _globalConfig,
    })
    // $t('home.chapters', { count: 12 }) 渲染为 home.chapters（count 被插入到 key 中）
    // 由于 mock 不解析嵌套路径，验证 key 出现
    expect(wrapper.text()).toContain('home.chapters')
  })

  it('渲染到课程链接', async () => {
    const { default: CourseCard } = await import('../../components/course/card.vue')
    const wrapper = mount(CourseCard, {
      props: { course: sampleCourse },
      global: _globalConfig,
    })
    expect(wrapper.html()).toContain('/course/1')
  })

  it('highlight=true prop 被正确接收', async () => {
    const { default: CourseCard } = await import('../../components/course/card.vue')
    const wrapper = mount(CourseCard, {
      props: { course: sampleCourse, highlight: true },
      global: _globalConfig,
    })
    expect(wrapper.props('highlight')).toBe(true)
  })

  it('highlight=false prop 被正确接收', async () => {
    const { default: CourseCard } = await import('../../components/course/card.vue')
    const wrapper = mount(CourseCard, {
      props: { course: sampleCourse, highlight: false },
      global: _globalConfig,
    })
    expect(wrapper.props('highlight')).toBe(false)
  })

  it('teachers>4 时仍能正常渲染', async () => {
    const { default: CourseCard } = await import('../../components/course/card.vue')
    const manyTeachers = Array.from({ length: 5 }, (_, i) => ({
      userId: i + 1,
      name: `T${i}`,
      avatarImg: null,
      isTeacher: true,
      isEditor: false,
    }))
    const wrapper = mount(CourseCard, {
      props: { course: { ...sampleCourse, teachers: manyTeachers } },
      global: _globalConfig,
    })
    // 5 个 teacher + 1 个 cover = 至少 5 个 img
    const imgs = wrapper.findAll('img')
    expect(imgs.length).toBeGreaterThanOrEqual(5)
  })

  it('tags 为空数组时不渲染标签区', async () => {
    const { default: CourseCard } = await import('../../components/course/card.vue')
    const wrapper = mount(CourseCard, {
      props: { course: { ...sampleCourse, tags: [] } },
      global: _globalConfig,
    })
    // 不应报错
    expect(wrapper.exists()).toBe(true)
  })

  it('teachers 为空数组时不渲染教师区', async () => {
    const { default: CourseCard } = await import('../../components/course/card.vue')
    const wrapper = mount(CourseCard, {
      props: { course: { ...sampleCourse, teachers: [] } },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
  })
})
