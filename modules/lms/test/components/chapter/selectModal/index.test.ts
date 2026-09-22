/**
 * chapter/selectModal/index.vue 组件测试
 * @see modules/lms/components/chapter/selectModal/index.vue
 *
 * 学生选择弹窗：全选/反选/随机抽取 + 加减分按钮。
 * 依赖 useChapterSelect()，测试中 stub 该 composable。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

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

function mockChapterSelect(overrides: any = {}) {
  return {
    loading: ref(false),
    saving: ref(false),
    randomizing: ref(false),
    students: ref<any[]>([]),
    selectedIds: ref<number[]>([]),
    randomCount: ref(1),
    customScore: ref(10),
    closePopovers: vi.fn(),
    toggleSelect: vi.fn(),
    selectAll: vi.fn(),
    clearSelection: vi.fn(),
    randomSelect: vi.fn(),
    adjustScore: vi.fn(),
    ...overrides,
  }
}

const WheelStub = {
  template: '<div class="wheel-stub" />',
  props: ['users', 'selectedIds', 'winner', 'celebrate', 'spinning'],
  emits: ['spin', 'pick', 'celebrateEnd', 'winnerClose'],
  // 与真实组件 defineExpose 的 spinTo 对齐：父组件 await 转盘旋转结束
  methods: { spinTo: async () => {} },
}

const _globalStubs = {
  UModal: {
    template: '<div v-if="open" class="modal"><slot name="content" /></div>',
    props: ['open', 'ui', 'scrollable'],
  },
  UButton: {
    template: '<button class="ubtn" :disabled="loading" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>',
    props: ['label', 'color', 'size', 'variant', 'icon', 'loading', 'disabled'],
    // 声明 emits 后 onClick 不再透传到根元素，避免一次点击触发两次
    emits: ['click'],
  },
  UInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" :type="type" />',
    props: ['modelValue', 'type', 'min', 'max', 'size', 'placeholder'],
  },
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  UTooltip: { template: '<div class="utooltip"><slot /></div>', props: ['text'] },
  ChapterSelectModalWheel: WheelStub,
  UPopover: { template: '<div class="upopover"><slot /><slot name="content" /></div>', props: ['modal'] },
  AuthUserCard: {
    template: '<div class="user-card" :class="{ selected }" @click="$emit(\'click\')" />',
    props: ['user', 'selected'],
  },
  ChapterSelectModalScoreButton: {
    template: '<div class="score-btn" />',
    props: ['delta', 'selectedCount', 'saving'],
    emits: ['confirm', 'cancel'],
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

describe('chapter/selectModal/index.vue', () => {
  it('open=true classId=0 时显示"无班级"', async () => {
    ;(globalThis as any).useChapterSelect = () => mockChapterSelect()
    const { default: SelectModal } = await import('../../../../components/chapter/selectModal/index.vue')
    const wrapper = mount(SelectModal, {
      props: { open: true, courseId: 1, classId: 0 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('chapter.noClass')
  })

  it('open=true loading=true 时显示加载中', async () => {
    ;(globalThis as any).useChapterSelect = () => mockChapterSelect({ loading: ref(true) })
    const { default: SelectModal } = await import('../../../../components/chapter/selectModal/index.vue')
    const wrapper = mount(SelectModal, {
      props: { open: true, courseId: 1, classId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('common.loading')
  })

  it('students 为空时显示"无学生"', async () => {
    ;(globalThis as any).useChapterSelect = () => mockChapterSelect({ loading: ref(false), students: ref([]) })
    const { default: SelectModal } = await import('../../../../components/chapter/selectModal/index.vue')
    const wrapper = mount(SelectModal, {
      props: { open: true, courseId: 1, classId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('classSelector.noUsers')
  })

  it('有学生时渲染学生卡片 + 全选/反选按钮', async () => {
    ;(globalThis as any).useChapterSelect = () =>
      mockChapterSelect({
        loading: ref(false),
        students: ref([
          { id: 1, name: '张三' },
          { id: 2, name: '李四' },
        ]),
      })
    const { default: SelectModal } = await import('../../../../components/chapter/selectModal/index.vue')
    const wrapper = mount(SelectModal, {
      props: { open: true, courseId: 1, classId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.findAll('.user-card').length).toBe(2)
    expect(wrapper.text()).toContain('chapter.selectAll')
    expect(wrapper.text()).toContain('chapter.selectNone')
  })

  it('点击全选按钮调用 selectAll', async () => {
    const ctx = mockChapterSelect({
      loading: ref(false),
      students: ref([{ id: 1, name: '张三' }]),
    })
    ;(globalThis as any).useChapterSelect = () => ctx
    const { default: SelectModal } = await import('../../../../components/chapter/selectModal/index.vue')
    const wrapper = mount(SelectModal, {
      props: { open: true, courseId: 1, classId: 1 },
      global: _globalConfig,
    })
    const selectAllBtn = wrapper.findAll('button').find(b => b.text().includes('chapter.selectAll'))
    await selectAllBtn!.trigger('click')
    expect(ctx.selectAll).toHaveBeenCalled()
  })

  it('selectedIds 非空时渲染加减分按钮区', async () => {
    ;(globalThis as any).useChapterSelect = () =>
      mockChapterSelect({
        loading: ref(false),
        students: ref([{ id: 1, name: '张三' }]),
        selectedIds: ref([1]),
      })
    const { default: SelectModal } = await import('../../../../components/chapter/selectModal/index.vue')
    const wrapper = mount(SelectModal, {
      props: { open: true, courseId: 1, classId: 1 },
      global: _globalConfig,
    })
    // 10 个 score-btn（+1..+5, -1..-5）
    expect(wrapper.findAll('.score-btn').length).toBe(10)
  })

  it('右上角模式切换按钮：切到转盘模式并隐藏卡片网格', async () => {
    ;(globalThis as any).useChapterSelect = () =>
      mockChapterSelect({
        loading: ref(false),
        students: ref([{ id: 1, name: '张三' }, { id: 2, name: '李四' }]),
      })
    const { default: SelectModal } = await import('../../../../components/chapter/selectModal/index.vue')
    const wrapper = mount(SelectModal, {
      props: { open: true, courseId: 1, classId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.find('.wheel-stub').exists()).toBe(false)
    expect(wrapper.findAll('.user-card').length).toBe(2)

    await wrapper.find('.picker-mode-btn').trigger('click')

    expect(wrapper.find('.wheel-stub').exists()).toBe(true)
    expect(wrapper.findAll('.user-card').length).toBe(0)
  })

  it('转盘模式随机抽取：转盘转完后选中中奖学生', async () => {
    const ctx = mockChapterSelect({
      loading: ref(false),
      students: ref([{ id: 7, name: '张三' }]),
    })
    ;(globalThis as any).useChapterSelect = () => ctx
    const { default: SelectModal } = await import('../../../../components/chapter/selectModal/index.vue')
    const wrapper = mount(SelectModal, {
      props: { open: true, courseId: 1, classId: 1 },
      global: _globalConfig,
    })
    await wrapper.find('.picker-mode-btn').trigger('click')

    const spinBtn = wrapper.findAll('button').find(b => b.text().includes('chapter.wheelSpin'))!
    await spinBtn.trigger('click')
    await flushPromises()

    expect(ctx.selectedIds.value).toEqual([7])
  })

  it('转盘模式手动点选扇区：切换该学生选中状态', async () => {
    const ctx = mockChapterSelect({
      loading: ref(false),
      students: ref([{ id: 1, name: '张三' }]),
    })
    ;(globalThis as any).useChapterSelect = () => ctx
    const { default: SelectModal } = await import('../../../../components/chapter/selectModal/index.vue')
    const wrapper = mount(SelectModal, {
      props: { open: true, courseId: 1, classId: 1 },
      global: _globalConfig,
    })
    await wrapper.find('.picker-mode-btn').trigger('click')

    wrapper.findComponent(WheelStub).vm.$emit('pick', { id: 1, name: '张三' })
    await flushPromises()

    expect(ctx.toggleSelect).toHaveBeenCalledWith(1)
  })

  it('抽中后中奖卡片不自动消失：烟花结束仍保留，点击卡片才关闭', async () => {
    const ctx = mockChapterSelect({
      loading: ref(false),
      students: ref([{ id: 7, name: '张三' }]),
    })
    ;(globalThis as any).useChapterSelect = () => ctx
    const { default: SelectModal } = await import('../../../../components/chapter/selectModal/index.vue')
    const wrapper = mount(SelectModal, {
      props: { open: true, courseId: 1, classId: 1 },
      global: _globalConfig,
    })
    await wrapper.find('.picker-mode-btn').trigger('click')

    await wrapper.findAll('button').find(b => b.text().includes('chapter.wheelSpin'))!.trigger('click')
    await flushPromises()
    // 抽中 → 中奖卡片出现
    expect(wrapper.findComponent(WheelStub).props('winner')).toMatchObject({ id: 7 })

    // 烟花播放结束 → 卡片必须保留（不能自动消失）
    wrapper.findComponent(WheelStub).vm.$emit('celebrateEnd')
    await flushPromises()
    expect(wrapper.findComponent(WheelStub).props('winner')).toMatchObject({ id: 7 })

    // 点击卡片 → 收起
    wrapper.findComponent(WheelStub).vm.$emit('winnerClose')
    await flushPromises()
    expect(wrapper.findComponent(WheelStub).props('winner')).toBeNull()
  })
})
