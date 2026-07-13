/**
 * chapter/view/index.vue 组件测试
 * @see modules/lms/components/chapter/view/index.vue
 *
 * 章节详情视图：标题 + 内容 + AI 笔记 + 上/下章导航 + 目录 + AI 助教。
 * 依赖 useChapterView()，测试中 stub 该 composable。focus：mount + props 渲染分支。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n, setMockAuthUser } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  setMockAuthUser({ id: 1, name: 'reader' }, [{ code: 'student' }], [])
  ;(globalThis as any).useChapterView = () => ({
    chapterPageCfg: ref({ showOutline: true, showNote: true }),
    aiRecord: ref({ type: 'doc', content: [] }),
    saveRecord: vi.fn(),
  })
})

const _globalStubs = {
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  UButton: {
    template: '<a class="ubtn" :href="to"><slot /></a>',
    props: ['to', 'label', 'color', 'variant', 'icon'],
  },
  UCard: { template: '<div class="ucard"><slot /></div>', props: ['ui'] },
  NuxtLink: { template: '<a class="nuxt-link" :href="to"><slot /></a>', props: ['to'] },
  ueditorRender: { template: '<div class="ueditor-render" />', props: ['json', 'courseId', 'trackReading'] },
  RichEditor: { template: '<div class="rich-editor" />', props: ['modelValue', 'allowTextMode'] },
  UPageAside: { template: '<div class="upage-aside"><slot /></div>' },
  LayoutToc: { template: '<div class="layout-toc" />' },
  ChapterViewAiAssistant: { template: '<div class="ai-assistant" />' },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('chapter/view/index.vue', () => {
  const sampleData = {
    chapter: { title: '第一章 入门', content: { type: 'doc', content: [] } },
    course: { title: 'Vue 课程', icon: 'i-lucide-book' },
  }

  it('data 存在时渲染章节标题与课程标题', async () => {
    const { default: View } = await import('../../../../components/chapter/view/index.vue')
    const wrapper = mount(View, {
      props: { data: sampleData, pending: false, notFound: false, chapterId: '1', courseId: '10' },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('第一章 入门')
    expect(wrapper.text()).toContain('Vue 课程')
  })

  it('data 存在时渲染 RichEditor（AI 笔记区）', async () => {
    const { default: View } = await import('../../../../components/chapter/view/index.vue')
    const wrapper = mount(View, {
      props: { data: sampleData, pending: false, notFound: false, chapterId: '1', courseId: '10' },
      global: _globalConfig,
    })
    expect(wrapper.find('.rich-editor').exists()).toBe(true)
    expect(wrapper.text()).toContain('chapter.aiContent')
  })

  it('data=null notFound=true pending=false 时显示"未找到"', async () => {
    const { default: View } = await import('../../../../components/chapter/view/index.vue')
    const wrapper = mount(View, {
      props: { data: null, pending: false, notFound: true, chapterId: '1', courseId: '10' },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('chapter.notFound')
  })

  it('data=null extraCondition=true 时显示"未开放"', async () => {
    const { default: View } = await import('../../../../components/chapter/view/index.vue')
    const wrapper = mount(View, {
      props: { data: null, pending: false, notFound: false, extraCondition: true, chapterId: '1', courseId: '10' },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('chapter.notOpen')
  })

  it('prevChapter 存在时渲染上一章导航', async () => {
    const { default: View } = await import('../../../../components/chapter/view/index.vue')
    const wrapper = mount(View, {
      props: {
        data: sampleData, pending: false, notFound: false,
        prevChapter: { to: '/course/10/chapter/0', label: '上一章' },
        chapterId: '1', courseId: '10',
      },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('上一章')
    expect(wrapper.html()).toContain('/course/10/chapter/0')
  })

  it('nextChapter 存在时渲染下一章导航', async () => {
    const { default: View } = await import('../../../../components/chapter/view/index.vue')
    const wrapper = mount(View, {
      props: {
        data: sampleData, pending: false, notFound: false,
        nextChapter: { to: '/course/10/chapter/2', label: '下一章' },
        chapterId: '1', courseId: '10',
      },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('下一章')
    expect(wrapper.html()).toContain('/course/10/chapter/2')
  })

  it('chapterPageCfg.showOutline=true 时渲染目录区', async () => {
    ;(globalThis as any).useChapterView = () => ({
      chapterPageCfg: ref({ showOutline: true }),
      aiRecord: ref({}),
      saveRecord: vi.fn(),
    })
    const { default: View } = await import('../../../../components/chapter/view/index.vue')
    const wrapper = mount(View, {
      props: { data: sampleData, pending: false, notFound: false, chapterId: '1', courseId: '10' },
      global: _globalConfig,
    })
    expect(wrapper.find('.layout-toc').exists()).toBe(true)
  })

  it('渲染 AI 助教组件', async () => {
    const { default: View } = await import('../../../../components/chapter/view/index.vue')
    const wrapper = mount(View, {
      props: { data: sampleData, pending: false, notFound: false, chapterId: '1', courseId: '10' },
      global: _globalConfig,
    })
    expect(wrapper.find('.ai-assistant').exists()).toBe(true)
  })
})
