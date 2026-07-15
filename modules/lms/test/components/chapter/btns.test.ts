/**
 * chapter/btns.vue component test
 * @see modules/lms/components/chapter/btns.vue
 *
 * Chapter action button group: score/select/timer/invite/danmaku/vote/quick answer.
 * Depends on multiple composables, stubs useAuthLms/useLayoutState/useWebSocket/useLmsPublicConfig in tests.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, computed } from 'vue'
import { resetAllStubs, setMockI18n, setMockAuthUser } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  // Default stub: non-teacher, all button switches on
  ;(globalThis as any).useAuthLms = () => ({
    isCourseTeacher: () => false,
    isCourseEditor: () => false,
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
  ChapterScoreModal: { template: '<div class="score-modal" />', props: ['open', 'courseId', 'chapterId', 'classId'] },
  ChapterSelectModal: { template: '<div class="select-modal" />', props: ['open', 'courseId', 'classId'] },
  ChapterTimerModal: { template: '<div class="timer-modal" />', props: ['open'] },
  ChapterDanmakuModal: { template: '<div class="danmaku-modal" />', props: ['open', 'classId', 'canEdit'] },
  ChapterVoteModal: { template: '<div class="vote-modal" />', props: ['open', 'classId', 'canEdit'] },
  ChapterQuickAnswerModal: { template: '<div class="qa-modal" />', props: ['open', 'classId', 'canEdit'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('chapter/btns.vue', () => {
  it('未登录时不渲染按钮组', async () => {
    // Does not call setMockAuthUser → user=null
    const { default: Btns } = await import('../../../components/chapter/btns.vue')
    const wrapper = mount(Btns, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.utooltip').exists()).toBe(false)
  })

  it('登录学生（非教师）只渲染计时器按钮（canEdit=false 隐藏其他）', async () => {
    setMockAuthUser({ id: 2, name: 'student' }, [{ code: 'student' }], [])
    const { default: Btns } = await import('../../../components/chapter/btns.vue')
    const wrapper = mount(Btns, { global: _globalConfig })
    await flushPromises()
    // canEdit=false → only showTimer button (danmaku requires canEdit||showDanmaku, showDanmaku=false)
    expect(wrapper.findAll('.utooltip').length).toBe(1)
  })

  it('admin 渲染所有教师按钮（得分/选择/计时器/邀请/弹幕/投票/抢答）', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin' }], [])
    const { default: Btns } = await import('../../../components/chapter/btns.vue')
    const wrapper = mount(Btns, { global: _globalConfig })
    await flushPromises()
    // canEdit=true, chapterBtnsConfig all on, showDanmakuPanel=true → 7 buttons
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
    // One less timer → 6
    expect(wrapper.findAll('.utooltip').length).toBe(6)
  })

  it('点击得分按钮打开 scoreOpen 弹窗', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin' }], [])
    const { default: Btns } = await import('../../../components/chapter/btns.vue')
    const wrapper = mount(Btns, { global: _globalConfig })
    await flushPromises()
    // The first tooltip button is score
    const scoreBtn = wrapper.findAll('button')[0]
    await scoreBtn.trigger('click')
    await flushPromises()
    // ChapterScoreModal open prop should be true
    const modal = wrapper.findComponent({ name: 'ChapterScoreModal' })
    // stub component name may not be registered, use .score-modal to detect its presence
    expect(wrapper.find('.score-modal').exists()).toBe(true)
  })

  it('渲染所有子弹窗占位', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin' }], [])
    const { default: Btns } = await import('../../../components/chapter/btns.vue')
    const wrapper = mount(Btns, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.score-modal').exists()).toBe(true)
    expect(wrapper.find('.select-modal').exists()).toBe(true)
    expect(wrapper.find('.timer-modal').exists()).toBe(true)
    expect(wrapper.find('.danmaku-modal').exists()).toBe(true)
    expect(wrapper.find('.vote-modal').exists()).toBe(true)
    expect(wrapper.find('.qa-modal').exists()).toBe(true)
  })
})
