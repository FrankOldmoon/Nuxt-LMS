/**
 * class/usersTable/resetModal.vue component test
 * @see modules/lms/components/class/usersTable/resetModal.vue
 *
 * Reset password modal: UModal + password input + confirm/cancel buttons.
 * Depends on useClassUsersTableContext() (inject), stubbed to globalThis in tests.
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
  UInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'placeholder'],
  },
  UButton: {
    template: '<button :disabled="disabled" @click="$emit(\'click\')">{{ label }}<slot /></button>',
    props: ['label', 'color', 'variant'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

function setupMockContext(overrides: any = {}) {
  const ctx = {
    resetOpen: ref(false),
    resetPassword: ref(''),
    doResetPassword: vi.fn(),
    ...overrides,
  }
  ;(globalThis as any).useClassUsersTableContext = () => ctx
  return ctx
}

describe('class/usersTable/resetModal.vue', () => {
  it('resetOpen=true 时渲染弹窗', async () => {
    setupMockContext({ resetOpen: ref(true) })
    const { default: ResetModal } = await import('../../../../components/class/usersTable/resetModal.vue')
    const wrapper = mount(ResetModal, { global: _globalConfig })
    expect(wrapper.find('.modal').exists()).toBe(true)
    expect(wrapper.text()).toContain('classSelector.resetPassword')
  })

  it('resetOpen=false 时不渲染弹窗', async () => {
    setupMockContext({ resetOpen: ref(false) })
    const { default: ResetModal } = await import('../../../../components/class/usersTable/resetModal.vue')
    const wrapper = mount(ResetModal, { global: _globalConfig })
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('显示取消和确认按钮', async () => {
    setupMockContext({ resetOpen: ref(true) })
    const { default: ResetModal } = await import('../../../../components/class/usersTable/resetModal.vue')
    const wrapper = mount(ResetModal, { global: _globalConfig })
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBe(2)
    expect(wrapper.text()).toContain('common.cancel')
    expect(wrapper.text()).toContain('classSelector.confirmReset')
  })

  it('密码为空时确认按钮禁用', async () => {
    setupMockContext({ resetOpen: ref(true), resetPassword: ref('') })
    const { default: ResetModal } = await import('../../../../components/class/usersTable/resetModal.vue')
    const wrapper = mount(ResetModal, { global: _globalConfig })
    const confirmBtn = wrapper.findAll('button')[1]
    expect(confirmBtn.attributes('disabled')).toBeDefined()
  })

  it('密码有值时确认按钮启用', async () => {
    setupMockContext({ resetOpen: ref(true), resetPassword: ref('newpass') })
    const { default: ResetModal } = await import('../../../../components/class/usersTable/resetModal.vue')
    const wrapper = mount(ResetModal, { global: _globalConfig })
    const confirmBtn = wrapper.findAll('button')[1]
    expect(confirmBtn.attributes('disabled')).toBeUndefined()
  })
})
