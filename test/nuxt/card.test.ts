import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, any>) => {
      if (key === 'home.chapters') return `${params?.count ?? 0} chapters`
      if (key === 'home.startLearning') return 'Start Learning'
      return key
    },
  }),
}))

const NuxtLinkStub = {
  name: 'NuxtLinkStub',
  inheritAttrs: false,
  setup(_: any, { slots, attrs }: any) {
    return () => h('a', { href: (attrs as any).to }, slots.default?.())
  },
}

const IconStub = {
  name: 'UIcon',
  inheritAttrs: false,
  setup(_: any, { attrs }: any) {
    return () => h('i', { 'data-icon': (attrs as any).name })
  },
}

const Card = await import('~/components/course/card.vue').then(m => m.default)

function makeWrapper(course: Record<string, any> = {}, highlight = false) {
  return mount(Card, {
    props: { course, highlight },
    global: {
      stubs: { NuxtLink: NuxtLinkStub, UIcon: IconStub },
      mocks: {
        $t: (key: string, params?: Record<string, any>) => {
          if (key === 'home.chapters') return `${params?.count ?? 0} chapters`
          if (key === 'home.startLearning') return 'Start Learning'
          return key
        },
      },
    },
  })
}

const baseCourse = {
  id: 1,
  title: 'Test Course',
  level: 'beginner',
  color: 'blue',
  icon: 'i-lucide-book',
  chapterCount: 5,
  coverImg: '',
  tags: [] as string[],
  teachers: [] as any[],
}

describe('course/card.vue', () => {
  it('renders course title', () => {
    const wrapper = makeWrapper(baseCourse)
    expect(wrapper.html()).toContain('Test Course')
  })

  it('renders link to /course/:id', () => {
    const wrapper = makeWrapper(baseCourse)
    expect(wrapper.html()).toContain('href="/course/1"')
  })

  it('renders cover image when coverImg provided', () => {
    const wrapper = makeWrapper({ ...baseCourse, coverImg: 'https://example.com/img.jpg' })
    const img = wrapper.find('img[alt="Test Course"]')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('https://example.com/img.jpg')
  })

  it('renders fallback icon when no coverImg', () => {
    const wrapper = makeWrapper({ ...baseCourse, coverImg: '' })
    expect(wrapper.html()).toContain('i-lucide-book')
  })

  it('renders level badge', () => {
    const wrapper = makeWrapper(baseCourse)
    expect(wrapper.html()).toContain('beginner')
  })

  it('renders tags when provided', () => {
    const wrapper = makeWrapper({ ...baseCourse, tags: ['Vue', 'Nuxt'] })
    expect(wrapper.html()).toContain('Vue')
    expect(wrapper.html()).toContain('Nuxt')
  })

  it('does not render tags section when empty', () => {
    const wrapper = makeWrapper({ ...baseCourse, tags: [] })
    expect(wrapper.html()).not.toContain('>Vue<')
  })

  it('renders teacher avatars when teachers provided', () => {
    const wrapper = makeWrapper({
      ...baseCourse,
      teachers: [
        { userId: 1, name: 'Alice', avatarImg: 'https://example.com/a.jpg' },
        { userId: 2, name: 'Bob', avatarImg: 'https://example.com/b.jpg' },
      ],
    })
    expect(wrapper.html()).toContain('Alice')
    expect(wrapper.html()).toContain('Bob')
  })

  it('shows +N when more than 4 teachers', () => {
    const teachers = Array.from({ length: 6 }, (_, i) => ({
      userId: i + 1,
      name: `Teacher${i + 1}`,
      avatarImg: '',
    }))
    const wrapper = makeWrapper({ ...baseCourse, teachers })
    expect(wrapper.html()).toContain('+2')
  })

  it('renders chapter count', () => {
    const wrapper = makeWrapper({ ...baseCourse, chapterCount: 10 })
    expect(wrapper.html()).toContain('10 chapters')
  })

  it('renders start learning text', () => {
    const wrapper = makeWrapper(baseCourse)
    expect(wrapper.html()).toContain('Start Learning')
  })

  it('applies highlight class when highlight=true', () => {
    const wrapper = makeWrapper(baseCourse, true)
    expect(wrapper.html()).toContain('ring-primary')
  })

  it('does not apply highlight class when highlight=false', () => {
    const wrapper = makeWrapper(baseCourse, false)
    expect(wrapper.html()).not.toContain('ring-primary/30')
  })
})
