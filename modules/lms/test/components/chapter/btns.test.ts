/**
 * chapter/btns.vue 组件测试
 * @see modules/lms/components/chapter/btns.vue
 *
 * 章节操作按钮组：得分/选择/计时器/邀请/弹幕/投票/抢答。
 * 依赖多个 composable，测试中 stub useAuthLms/useLayoutState/useWebSocket/useLmsPublicConfig。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, computed } from 'vue'
import { resetAllStubs, setMockI18n, setMockAuthUser } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  // 默认 stub：非教师、所有按钮开关开启
  ;(globalThis as any).useAuthLms = () => ({
    isCourseTeacher: () => false,
    isCourseEditor: () => false,
    isCourseStaff: () => false,
    canEditCourse: () => false,
  })
  ;(globalThis as any).useLayoutState = () => ({
    showDanmaku: ref(false),
    chapterBtnsConfig: ref({
      showScore: true, showSelect: true, showTimer: true, showInvite: true,
      showDanmaku: true, showVote: true, showQuickAnswer: true,
    }),
    notifyCourseNavUpdate: vi.fn(),
  })
  ;(globalThis as any).useWebSocket = () => ({ sendInvite: vi.fn() })
  ;(globalThis as any).useLmsPublicConfig = () => ({
    chapterPage: computed(() => ({ showDanmakuPanel: true, showOutline: true })),
  })
})

const _globalStubs = {
  UTooltip: { template: '<span class="utooltip"><slot /></span>', props: ['text'] },
  UButton: {
    template: '<button :disabled="loading" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['icon', 'color', 'variant', 'size', 'loading', 'label', 'to'],
  },
  // 模板已改用 Lazy 前缀（defineAsyncComponent），测试环境无 Nuxt 自动导入，
  // Lazy 与非 Lazy 两个名字都给出桩
  ChapterScoreModal: { template: '<div class="score-modal" />', props: ['open', 'courseId', 'chapterId', 'classId'] },
  LazyChapterScoreModal: { template: '<div class="score-modal" />', props: ['open', 'courseId', 'chapterId', 'classId'] },
  ChapterSelectModal: { template: '<div class="select-modal" />', props: ['open', 'courseId', 'classId'] },
  LazyChapterSelectModal: { template: '<div class="select-modal" />', props: ['open', 'courseId', 'classId'] },
  ChapterTimerModal: { template: '<div class="timer-modal" />', props: ['open'] },
  LazyChapterTimerModal: { template: '<div class="timer-modal" />', props: ['open'] },
  ChapterDanmakuModal: { template: '<div class="danmaku-modal" />', props: ['open', 'classId', 'canEdit'] },
  LazyChapterDanmakuModal: { template: '<div class="danmaku-modal" />', props: ['open', 'classId', 'canEdit'] },
  ChapterVoteModal: { template: '<div class="vote-modal" />', props: ['open', 'classId', 'canEdit'] },
  LazyChapterVoteModal: { template: '<div class="vote-modal" />', props: ['open', 'classId', 'canEdit'] },
  ChapterQuickAnswerModal: { template: '<div class="qa-modal" />', props: ['open', 'classId', 'canEdit'] },
  LazyChapterQuickAnswerModal: { template: '<div class="qa-modal" />', props: ['open', 'classId', 'canEdit'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('chapter/btns.vue', () => {
  it('未登录时不渲染按钮组', async () => {
    // 不调用 setMockAuthUser → user=null
    const { default: Btns } = await import('../../../components/chapter/btns.vue')
    const wrapper = mount(Btns, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.utooltip').exists()).toBe(false)
  })

  it('登录学生（非教师）不渲染任何教师按钮（timer/弹幕默认不对普通用户显示）', async () => {
    setMockAuthUser({ id: 2, name: 'student' }, [{ code: 'student' }], [])
    const { default: Btns } = await import('../../../components/chapter/btns.vue')
    const wrapper = mount(Btns, { global: _globalConfig })
    await flushPromises()
    // canEdit=false → 得分/选择/计时器/邀请/弹幕/投票/抢答 全部隐藏
    expect(wrapper.findAll('.utooltip').length).toBe(0)
  })

  it('admin 渲染所有教师按钮（得分/选择/计时器/邀请/弹幕/投票/抢答）', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin' }], [])
    const { default: Btns } = await import('../../../components/chapter/btns.vue')
    const wrapper = mount(Btns, { global: _globalConfig })
    await flushPromises()
    // canEdit=true，chapterBtnsConfig 全开，showDanmakuPanel=true → 7 个按钮
    expect(wrapper.findAll('.utooltip').length).toBe(7)
  })

  it('chapterBtnsConfig.showTimer=false 时不渲染计时器按钮', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin' }], [])
    ;(globalThis as any).useLayoutState = () => ({
      showDanmaku: ref(true),
      chapterBtnsConfig: ref({
        showScore: true, showSelect: true, showTimer: false, showInvite: true,
        showDanmaku: true, showVote: true, showQuickAnswer: true,
      }),
      notifyCourseNavUpdate: vi.fn(),
    })
    const { default: Btns } = await import('../../../components/chapter/btns.vue')
    const wrapper = mount(Btns, { global: _globalConfig })
    await flushPromises()
    // 少 1 个 timer → 6 个
    expect(wrapper.findAll('.utooltip').length).toBe(6)
  })

  it('点击得分按钮打开 scoreOpen 弹窗', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin' }], [])
    const { default: Btns } = await import('../../../components/chapter/btns.vue')
    const wrapper = mount(Btns, { global: _globalConfig })
    await flushPromises()
    // 第一个 tooltip 的按钮是得分
    const scoreBtn = wrapper.findAll('button')[0]
    await scoreBtn.trigger('click')
    await flushPromises()
    // ChapterScoreModal open prop 应为 true
    const modal = wrapper.findComponent({ name: 'ChapterScoreModal' })
    // stub 组件名可能未注册，用 .score-modal 检测其存在
    expect(wrapper.find('.score-modal').exists()).toBe(true)
  })

  it('未打开时不渲染任何子弹窗', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin' }], [])
    const { default: Btns } = await import('../../../components/chapter/btns.vue')
    const wrapper = mount(Btns, { global: _globalConfig })
    await flushPromises()
    // v-if 门控：未打开的弹窗不参与渲染（含 SSR），否则其 chunk 会被 modulepreload 阻塞首屏
    for (const cls of ['.score-modal', '.select-modal', '.timer-modal', '.danmaku-modal', '.vote-modal', '.qa-modal']) {
      expect(wrapper.find(cls).exists()).toBe(false)
    }
  })

  it('点击按钮后按需渲染对应弹窗', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin' }], [])
    const { default: Btns } = await import('../../../components/chapter/btns.vue')
    const wrapper = mount(Btns, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.score-modal').exists()).toBe(false)
    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    await flushPromises()
    // 第一个按钮是得分 → 打开后才渲染
    expect(wrapper.find('.score-modal').exists()).toBe(true)
  })
})
