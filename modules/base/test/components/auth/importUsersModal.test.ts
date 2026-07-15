/**
 * auth/importUsersModal.vue component tests
 * @see modules/base/components/auth/importUsersModal.vue
 *
 * importUsersModal manages batch import logic via useImportUsers, internally uses the sheet component.
 */
import {
  describe, it, expect, beforeEach,
  mount, flushPromises,
  _globalStubs, _globalConfig, baseBeforeEach,
} from './_shared'

beforeEach(() => {
  baseBeforeEach()
})

const _stubs = {
  ..._globalStubs,
  // sheet component (modules/base/components/sheet/index.vue) stubbed as a passthrough div
  Sheet: {
    template: '<div class="stub-sheet" />',
    props: ['headers', 'colWidths', 'active', 'showTools', 'showFooter'],
  },
}

describe('auth/importUsersModal.vue', () => {
  it('open=true 时渲染弹窗及标题', async () => {
    const { default: ImportUsersModal } = await import('../../../components/auth/importUsersModal.vue')
    const wrapper = mount(ImportUsersModal, {
      props: { open: true },
      global: { ..._globalConfig, stubs: _stubs },
    })
    expect(wrapper.text()).toContain('importUsers.title')
    expect(wrapper.find('.modal').exists()).toBe(true)
  })

  it('open=false 时不渲染弹窗内容', async () => {
    const { default: ImportUsersModal } = await import('../../../components/auth/importUsersModal.vue')
    const wrapper = mount(ImportUsersModal, {
      props: { open: false },
      global: { ..._globalConfig, stubs: _stubs },
    })
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('渲染导入按钮', async () => {
    const { default: ImportUsersModal } = await import('../../../components/auth/importUsersModal.vue')
    const wrapper = mount(ImportUsersModal, {
      props: { open: true },
      global: { ..._globalConfig, stubs: _stubs },
    })
    const buttons = wrapper.findAll('button.ubtn')
    expect(buttons.some(b => b.text().includes('importUsers.import'))).toBe(true)
  })

  it('渲染必需/可选列提示文本', async () => {
    const { default: ImportUsersModal } = await import('../../../components/auth/importUsersModal.vue')
    const wrapper = mount(ImportUsersModal, {
      props: { open: true },
      global: { ..._globalConfig, stubs: _stubs },
    })
    expect(wrapper.text()).toContain('importUsers.requiredColumns')
    expect(wrapper.text()).toContain('importUsers.optionalColumns')
    expect(wrapper.text()).toContain('username, email, class')
  })
})
