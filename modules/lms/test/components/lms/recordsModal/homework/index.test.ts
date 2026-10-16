/**
 * lms/recordsModal/homework/index.vue 组件测试
 * @see modules/lms/components/lms/recordsModal/homework/index.vue
 *
 * 作业记录弹窗：UModal + ClassUsersTable + 打分输入 + 详情弹窗
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

// mock useHomeworkRecords（本地导入）
// 可变的评阅详情状态：测试中通过 helpers 控制
const h = vi.hoisted(() => ({
  state: { detailOpen: false, detailData: null as any, detailIndex: 0, detailTotal: 0 },
  files: [] as { url: string; name: string }[],
  prevSubmission: vi.fn(),
  nextSubmission: vi.fn(),
  downloadAllFiles: vi.fn(),
  scoreAllSubmitted: vi.fn(),
}))

vi.mock('../../../../../components/lms/recordsModal/homework/useHomeworkRecords', () => ({
  useHomeworkRecords: (props: any, emit: any) => {
    const { ref, computed, reactive }: any = globalThis as any
    return {
      open: computed({
        get: () => props.modelValue,
        set: (v: boolean) => emit('update:modelValue', v),
      }),
      rows: ref([]),
      pending: ref(false),
      extraColumns: computed(() => [
        { id: 'record', header: 'Record' },
        { id: 'score', header: 'Score' },
      ]),
      defaultSort: [{ id: 'record', desc: true }],
      scoreMap: reactive({}),
      commentMap: reactive({}),
      excellentMap: reactive({}),
      onScoreBlur: vi.fn(),
      onQuickScore: vi.fn(),
      onCommentBlur: vi.fn(),
      toggleExcellent: vi.fn(),
      detailOpen: ref(h.state.detailOpen),
      detailData: ref(h.state.detailData),
      detailRecord: ref(h.state.detailData?.record ?? null),
      detailIndex: ref(h.state.detailIndex),
      detailTotal: computed(() => h.state.detailTotal),
      openHomeworkDetail: vi.fn(),
      prevSubmission: h.prevSubmission,
      nextSubmission: h.nextSubmission,
      downloadingAll: ref(false),
      downloadAllFiles: h.downloadAllFiles,
      scoringAll: ref(false),
      scoreAllSubmitted: h.scoreAllSubmitted,
      isRichDoc: (content: any) => typeof content === 'object',
    }
  },
}))

// 附件预览统一走 ueditor file 扩展的预览组件（stub 后断言分发的 url/name）
vi.mock('../../../../../components/ueditor/render/nodes/file-preview.vue', () => ({
  default: {
    template: '<div class="file-preview-stub" :data-url="url" :data-name="name" />',
    props: ['url', 'name'],
  },
}))

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  h.state.detailOpen = false
  h.state.detailData = null
  h.state.detailIndex = 0
  h.state.detailTotal = 0
  h.files = []
  // useFileNames 由 base 模块 addImportsDir 自动导入，测试中 globalThis stub
  ;(globalThis as any).useFileNames = () => ref(h.files)
  // 站点时区：时间显示用固定时区
  ;(globalThis as any).useSiteConfig = () => ({ config: ref({}), siteTimeZone: ref('Asia/Shanghai') })
})

const _globalStubs = {
  UModal: {
    template: '<div v-if="open" class="modal"><slot name="body" /><slot name="content" /></div>',
    props: ['open', 'scrollable', 'fullscreen'],
  },
  ClassUsersTable: {
    template: '<div class="class-users-table" />',
    props: ['rows', 'loading', 'extraColumns', 'hideActions', 'hideTeachers', 'defaultSort'],
  },
  UButton: {
    template: '<button class="ubutton" :data-icon="icon" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>',
    props: ['icon', 'label', 'size', 'variant', 'color'],
  },
  UInput: {
    template: '<input class="uinput" :value="modelValue" :type="type" :max="max" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'size', 'max', 'placeholder'],
  },
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  UTooltip: { template: '<span><slot /></span>', props: ['text'] },
  AuthUserCard: { template: '<span class="auth-user-card">{{ user?.name }}</span>', props: ['user'] },
  ueditorRender: { template: '<div class="ueditor-render" />', props: ['json', 'courseId'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('lms/recordsModal/homework/index.vue', () => {
  it('modelValue=true 时渲染弹窗', async () => {
    const { default: HomeworkRecords } = await import('../../../../../components/lms/recordsModal/homework/index.vue')
    const wrapper = mount(HomeworkRecords, {
      props: { modelValue: true, courseId: 1, cid: 100, maxScore: 100 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(true)
  })

  it('modelValue=false 时不渲染弹窗', async () => {
    const { default: HomeworkRecords } = await import('../../../../../components/lms/recordsModal/homework/index.vue')
    const wrapper = mount(HomeworkRecords, {
      props: { modelValue: false, courseId: 1, cid: 100, maxScore: 100 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('渲染作业记录标题', async () => {
    const { default: HomeworkRecords } = await import('../../../../../components/lms/recordsModal/homework/index.vue')
    const wrapper = mount(HomeworkRecords, {
      props: { modelValue: true, courseId: 1, cid: 100, maxScore: 100 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('record.homeworkRecords')
  })

  it('渲染 ClassUsersTable', async () => {
    const { default: HomeworkRecords } = await import('../../../../../components/lms/recordsModal/homework/index.vue')
    const wrapper = mount(HomeworkRecords, {
      props: { modelValue: true, courseId: 1, cid: 100, maxScore: 100 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.class-users-table').exists()).toBe(true)
  })

  it('标题旁显示该作业满分', async () => {
    const { default: HomeworkRecords } = await import('../../../../../components/lms/recordsModal/homework/index.vue')
    const wrapper = mount(HomeworkRecords, {
      props: { modelValue: true, courseId: 1, cid: 100, maxScore: 88 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('record.fullScore')
    expect(wrapper.text()).toContain('88')
  })

  it('顶部渲染「下载全部附件」按钮，点击触发 downloadAllFiles', async () => {
    h.downloadAllFiles.mockClear()
    const { default: HomeworkRecords } = await import('../../../../../components/lms/recordsModal/homework/index.vue')
    const wrapper = mount(HomeworkRecords, {
      props: { modelValue: true, courseId: 1, cid: 100, maxScore: 100 },
      global: _globalConfig,
    })
    await flushPromises()
    const btn = wrapper.findAll('button').find(b => b.text().includes('record.downloadAllFiles'))
    expect(btn).toBeTruthy()
    await btn!.trigger('click')
    expect(h.downloadAllFiles).toHaveBeenCalled()
  })

  it('顶部「全部满分」按钮：确认后触发 scoreAllSubmitted', async () => {
    h.scoreAllSubmitted.mockClear()
    const { default: HomeworkRecords } = await import('../../../../../components/lms/recordsModal/homework/index.vue')
    const wrapper = mount(HomeworkRecords, {
      props: { modelValue: true, courseId: 1, cid: 100, maxScore: 100 },
      global: _globalConfig,
    })
    await flushPromises()
    const openBtn = wrapper.findAll('button').find(b => b.text().includes('record.scoreAllSubmitted'))
    expect(openBtn).toBeTruthy()
    await openBtn!.trigger('click')
    const confirmBtn = wrapper.findAll('button').find(b => b.text().includes('common.confirm'))
    expect(confirmBtn).toBeTruthy()
    await confirmBtn!.trigger('click')
    expect(h.scoreAllSubmitted).toHaveBeenCalled()
  })

  it('正确接收 maxScore prop', async () => {
    const { default: HomeworkRecords } = await import('../../../../../components/lms/recordsModal/homework/index.vue')
    const wrapper = mount(HomeworkRecords, {
      props: { modelValue: true, courseId: 1, cid: 100, maxScore: 50 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('maxScore')).toBe(50)
  })

  it('正确接收 courseId 和 cid props', async () => {
    const { default: HomeworkRecords } = await import('../../../../../components/lms/recordsModal/homework/index.vue')
    const wrapper = mount(HomeworkRecords, {
      props: { modelValue: true, courseId: 42, cid: 999, maxScore: 100 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('courseId')).toBe(42)
    expect(wrapper.props('cid')).toBe(999)
  })

  // ==================== 全屏逐份评阅详情 ====================
  function openDetail() {
    h.state.detailOpen = true
    h.state.detailData = {
      id: 7, name: 'Stu7', username: 'stu7', preferName: null, rollNumber: null, avatarImg: null,
      record: { content: '', score: null, comment: null, excellent: false, files: ['/api/files/serve?pathname=7%2Fa.pdf'] },
    }
    h.state.detailTotal = 3
    h.state.detailIndex = 1
    h.files = [{ url: '/api/files/serve?pathname=7%2Fa.pdf', name: 'a.pdf' }]
  }

  it('详情弹窗：附件用 ueditor file 扩展预览组件渲染，并显示序号/总数与用户', async () => {
    openDetail()
    const { default: HomeworkRecords } = await import('../../../../../components/lms/recordsModal/homework/index.vue')
    const wrapper = mount(HomeworkRecords, {
      props: { modelValue: true, courseId: 1, cid: 100, maxScore: 100 },
      global: _globalConfig,
    })
    await flushPromises()
    const preview = wrapper.find('.file-preview-stub')
    expect(preview.exists()).toBe(true)
    expect(preview.attributes('data-url')).toBe('/api/files/serve?pathname=7%2Fa.pdf')
    expect(preview.attributes('data-name')).toBe('a.pdf')
    expect(wrapper.text()).toContain('2/3')       // 当前序号/总数
    expect(wrapper.text()).toContain('Stu7')        // 当前用户
    expect(wrapper.text()).toContain('a.pdf')       // 文件名 chip
  })

  it('详情弹窗：无附件时不渲染预览组件，作答内容占满主区', async () => {
    openDetail()
    h.files = []
    const { default: HomeworkRecords } = await import('../../../../../components/lms/recordsModal/homework/index.vue')
    const wrapper = mount(HomeworkRecords, {
      props: { modelValue: true, courseId: 1, cid: 100, maxScore: 100 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.file-preview-stub').exists()).toBe(false)
  })

  it('详情弹窗：前后切换按钮触发 prev/next 回调', async () => {
    openDetail()
    h.prevSubmission.mockClear()
    h.nextSubmission.mockClear()
    const { default: HomeworkRecords } = await import('../../../../../components/lms/recordsModal/homework/index.vue')
    const wrapper = mount(HomeworkRecords, {
      props: { modelValue: true, courseId: 1, cid: 100, maxScore: 100 },
      global: _globalConfig,
    })
    await flushPromises()
    await wrapper.find('button[data-icon="i-lucide-chevron-left"]').trigger('click')
    expect(h.prevSubmission).toHaveBeenCalled()
    await wrapper.find('button[data-icon="i-lucide-chevron-right"]').trigger('click')
    expect(h.nextSubmission).toHaveBeenCalled()
  })

  // ==================== 满分按钮 ====================
  it('「一键满分」按钮只保留字面「100%」文字、不带图标（score 列 + view detail）', async () => {
    openDetail()
    const { default: HomeworkRecords } = await import('../../../../../components/lms/recordsModal/homework/index.vue')
    const wrapper = mount(HomeworkRecords, {
      props: { modelValue: true, courseId: 1, cid: 100, maxScore: 100 },
      global: _globalConfig,
    })
    await flushPromises()
    // 按钮上必须有字面「100%」文字，且不带图标。
    // 注意：这里只断言到 1 个 —— score 列的那个按钮在 ClassUsersTable 的 #score-cell 插槽里，
    // 而桩组件不渲染插槽；详情弹窗里的那个能直接断言。
    const quickScoreBtns = wrapper.findAll('button').filter((b) => b.text().includes('100%'))
    expect(quickScoreBtns.length).toBe(1)
    expect(quickScoreBtns[0].attributes('data-icon')).toBeUndefined()
    // 顶栏「一键全部满分」保留图标 + 文案
    expect(wrapper.findAll('button[data-icon="i-heroicons-percent-badge"]').length).toBe(1)
    // 不应再出现打钩类图标
    expect(wrapper.findAll('button[data-icon="i-heroicons-check"]').length).toBe(0)
    expect(wrapper.findAll('button[data-icon="i-heroicons-check-badge"]').length).toBe(0)
  })
})
