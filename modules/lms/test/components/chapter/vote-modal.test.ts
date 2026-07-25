/**
 * chapter/vote-modal.vue 组件测试
 * @see modules/lms/components/chapter/vote-modal.vue
 *
 * 投票弹窗：教师创建/查看/结束投票；学生投票/查看结果。
 * 依赖 useChapterVote()，测试中 stub 该 composable。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

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
})

function mockChapterVote(overrides: any = {}) {
  return {
    question: ref(''),
    options: ref(['', '']),
    activeVoteId: ref<string | null>(null),
    voteQuestion: ref(''),
    voteOptions: ref<string[]>([]),
    voteResults: ref<number[]>([]),
    voteTotal: ref(0),
    voted: ref(false),
    canStartVote: ref(false),
    addOption: vi.fn(),
    removeOption: vi.fn(),
    startVote: vi.fn(),
    submitVote: vi.fn(),
    endVote: vi.fn(),
    resetVote: vi.fn(),
    barWidth: (i: number) => '0%',
    ...overrides,
  }
}

const _globalStubs = {
  UModal: {
    template: '<div v-if="open" class="modal"><slot name="content" /></div>',
    props: ['open'],
  },
  UInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder'],
  },
  UButton: {
    template: '<button class="ubtn" :disabled="disabled" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>',
    props: ['label', 'color', 'size', 'variant', 'icon', 'disabled'],
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

describe('chapter/vote-modal.vue', () => {
  it('教师 canEdit=true 无活跃投票时显示创建表单', async () => {
    ;(globalThis as any).useChapterVote = () => mockChapterVote()
    const { default: VoteModal } = await import('../../../components/chapter/vote-modal.vue')
    const wrapper = mount(VoteModal, {
      props: { open: true, classId: 1, canEdit: true },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('chapter.voteStart')
    expect(wrapper.text()).toContain('chapter.voteAddOption')
  })

  it('教师有活跃投票时显示进度 + 结束按钮', async () => {
    ;(globalThis as any).useChapterVote = () =>
      mockChapterVote({
        activeVoteId: ref('vote-1'),
        question: ref('选哪个？'),
        voteQuestion: ref('选哪个？'),
        voteOptions: ref(['A', 'B']),
        voteResults: ref([3, 2]),
        voteTotal: ref(5),
      })
    const { default: VoteModal } = await import('../../../components/chapter/vote-modal.vue')
    const wrapper = mount(VoteModal, {
      props: { open: true, classId: 1, canEdit: true },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('选哪个？')
    expect(wrapper.text()).toContain('A')
    expect(wrapper.text()).toContain('B')
    expect(wrapper.text()).toContain('chapter.voteEnd')
  })

  it('点击添加选项按钮调用 addOption', async () => {
    const ctx = mockChapterVote()
    ;(globalThis as any).useChapterVote = () => ctx
    const { default: VoteModal } = await import('../../../components/chapter/vote-modal.vue')
    const wrapper = mount(VoteModal, {
      props: { open: true, classId: 1, canEdit: true },
      global: _globalConfig,
    })
    const addBtn = wrapper.findAll('button').find(b => b.text().includes('chapter.voteAddOption'))
    await addBtn!.trigger('click')
    expect(ctx.addOption).toHaveBeenCalled()
  })

  it('canStartVote=false 时开始投票按钮 disabled', async () => {
    ;(globalThis as any).useChapterVote = () => mockChapterVote({ canStartVote: ref(false) })
    const { default: VoteModal } = await import('../../../components/chapter/vote-modal.vue')
    const wrapper = mount(VoteModal, {
      props: { open: true, classId: 1, canEdit: true },
      global: _globalConfig,
    })
    const startBtn = wrapper.findAll('button').find(b => b.text().includes('chapter.voteStart'))
    expect((startBtn!.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('学生有活跃投票且未投票时显示选项按钮', async () => {
    ;(globalThis as any).useChapterVote = () =>
      mockChapterVote({
        activeVoteId: ref('vote-1'),
        voteQuestion: ref('Q?'),
        voteOptions: ref(['X', 'Y']),
        voted: ref(false),
      })
    const { default: VoteModal } = await import('../../../components/chapter/vote-modal.vue')
    const wrapper = mount(VoteModal, {
      props: { open: true, classId: 1, canEdit: false },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('X')
    expect(wrapper.text()).toContain('Y')
  })

  it('学生点击选项调用 submitVote', async () => {
    const ctx = mockChapterVote({
      activeVoteId: ref('vote-1'),
      voteQuestion: ref('Q?'),
      voteOptions: ref(['X', 'Y']),
      voted: ref(false),
    })
    ;(globalThis as any).useChapterVote = () => ctx
    const { default: VoteModal } = await import('../../../components/chapter/vote-modal.vue')
    const wrapper = mount(VoteModal, {
      props: { open: true, classId: 1, canEdit: false },
      global: _globalConfig,
    })
    // 选项按钮是带 label=X/Y 的 button
    const optBtn = wrapper.findAll('button').find(b => b.text() === 'X')
    await optBtn!.trigger('click')
    expect(ctx.submitVote).toHaveBeenCalledWith(0)
  })

  it('学生无活跃投票时显示无活跃提示', async () => {
    ;(globalThis as any).useChapterVote = () => mockChapterVote({ activeVoteId: ref(null) })
    const { default: VoteModal } = await import('../../../components/chapter/vote-modal.vue')
    const wrapper = mount(VoteModal, {
      props: { open: true, classId: 1, canEdit: false },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('chapter.voteNoActive')
  })
})
