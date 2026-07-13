/**
 * class/usersTable/exportSheet.vue 组件测试
 * @see modules/lms/components/class/usersTable/exportSheet.vue
 *
 * 导出弹窗：UModal + Sheet 组件 + 下载按钮（xlsx/csv）。
 * 依赖 useClassUsersTableContext()（inject），测试中 stub 到 globalThis。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UModal: {
    template: '<div v-if="open" class="modal"><slot name="content" /></div>',
    props: ['open', 'ui'],
  },
  UButton: {
    template: '<button :disabled="loading" @click="$emit(\'click\')">{{ label }}<slot /></button>',
    props: ['icon', 'color', 'size', 'variant', 'label', 'loading'],
  },
  Sheet: { template: '<div class="sheet" />', props: ['headers', 'initialData', 'rowCount', 'showTools'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

function setupMockContext(overrides: any = {}) {
  const ctx = {
    students: ref([
      { id: 1, name: 'Alice', preferName: 'Al', rollNumber: 'R001', number: '1' },
      { id: 2, name: 'Bob', preferName: 'Bo', rollNumber: 'R002', number: '2' },
    ]),
    extraColumns: () => [],
    hideNumber: () => false,
    ...overrides,
  }
  ;(globalThis as any).useClassUsersTableContext = () => ctx
  // useGradesContext 在 try/catch 中调用，不注入会走 catch（正常场景）
  return ctx
}

describe('class/usersTable/exportSheet.vue', () => {
  it('open=true 时渲染弹窗', async () => {
    setupMockContext()
    const { default: ExportSheet } = await import('../../../../components/class/usersTable/exportSheet.vue')
    const wrapper = mount(ExportSheet, {
      props: { open: true },
      global: _globalConfig,
    })
    expect(wrapper.find('.modal').exists()).toBe(true)
  })

  it('open=false 时不渲染弹窗', async () => {
    setupMockContext()
    const { default: ExportSheet } = await import('../../../../components/class/usersTable/exportSheet.vue')
    const wrapper = mount(ExportSheet, {
      props: { open: false },
      global: _globalConfig,
    })
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('显示导出标题和提示', async () => {
    setupMockContext()
    const { default: ExportSheet } = await import('../../../../components/class/usersTable/exportSheet.vue')
    const wrapper = mount(ExportSheet, {
      props: { open: true },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('classSelector.exportTitle')
    expect(wrapper.text()).toContain('classSelector.exportHint')
  })

  it('显示下载按钮', async () => {
    setupMockContext()
    const { default: ExportSheet } = await import('../../../../components/class/usersTable/exportSheet.vue')
    const wrapper = mount(ExportSheet, {
      props: { open: true },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('classSelector.downloadXlsx')
  })

  it('正确接收 open prop（v-model）', async () => {
    setupMockContext()
    const { default: ExportSheet } = await import('../../../../components/class/usersTable/exportSheet.vue')
    const wrapper = mount(ExportSheet, {
      props: { open: true },
      global: _globalConfig,
    })
    expect(wrapper.props('open')).toBe(true)
  })
})
