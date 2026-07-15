/**
 * chapter/historyModal/index.vue component test
 * @see modules/lms/components/chapter/historyModal/index.vue
 *
 * History version modal: trigger button + content preview + pagination/restore.
 * Logic provided by useChapterHistory(), imports real composable, stubs useLayoutState in tests.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n, setMockFetchHandler } from '../../../../../../test/setup/nuxt-stubs'
import { useChapterHistory } from '../../../../composables/useChapterHistory'

;(globalThis as any).useChapterHistory = useChapterHistory

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  // useChapterHistory calls useLayoutState().notifyContentSaved
  ;(globalThis as any).useLayoutState = () => ({
    notifyContentSaved: vi.fn(),
    notifyCourseNavUpdate: vi.fn(),
  })
  setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
})

const _globalStubs = {
  UModal: {
    template: '<div class="umodal"><slot /><slot name="body" /></div>',
    props: ['open', 'ui'],
  },
  UButton: {
    template: '<button class="ubtn" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['icon', 'color', 'variant', 'size', 'label'],
  },
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  ueditorRender: { template: '<div class="ueditor-render" />', props: ['json'] },
  ChapterHistoryModalFooter: {
    template: '<div class="history-footer" />',
    props: ['page', 'total', 'currentVersion', 'restoring'],
    emits: ['prev', 'next', 'restore'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('chapter/historyModal/index.vue', () => {
  it('默认渲染触发按钮（layout.history）', async () => {
    const { default: HistoryModal } = await import('../../../../components/chapter/historyModal/index.vue')
    const wrapper = mount(HistoryModal, {
      props: { table: 'chapters', id: 1 },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain('layout.history')
  })

  it('无版本时显示空状态', async () => {
    const { default: HistoryModal } = await import('../../../../components/chapter/historyModal/index.vue')
    const wrapper = mount(HistoryModal, {
      props: { table: 'chapters', id: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('layout.historyEmpty')
  })

  it('id=0 时不拉取版本（versions 为空）', async () => {
    const { default: HistoryModal } = await import('../../../../components/chapter/historyModal/index.vue')
    const wrapper = mount(HistoryModal, {
      props: { table: 'chapters', id: 0 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('layout.historyEmpty')
  })

  it('接受 table prop', async () => {
    const { default: HistoryModal } = await import('../../../../components/chapter/historyModal/index.vue')
    const wrapper = mount(HistoryModal, {
      props: { table: 'questions', id: 5 },
      global: _globalConfig,
    })
    expect(wrapper.props('table')).toBe('questions')
  })

  it('table 为空字符串时不报错', async () => {
    const { default: HistoryModal } = await import('../../../../components/chapter/historyModal/index.vue')
    const wrapper = mount(HistoryModal, {
      props: { table: '', id: 5 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.exists()).toBe(true)
  })
})
