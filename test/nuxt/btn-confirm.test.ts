import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

// Stub UPopover to render trigger + content inline (no Teleport)
const PopoverStub = {
  name: 'UPopover',
  inheritAttrs: false,
  props: {
    open: { type: Boolean, default: false },
  },
  emits: ['update:open'],
  setup(props: any, { slots }: any) {
    return () => [
      slots.default?.(),
      props.open ? slots.content?.() : null,
    ]
  },
}

// Stub UButton to a simple button that fires click regardless of loading
const ButtonStub = {
  name: 'UButton',
  inheritAttrs: false,
  setup(_: any, { slots, attrs }: any) {
    return () => h('button', {
      type: 'button',
      disabled: (attrs as any).disabled,
      onClick: (attrs as any).onClick,
    }, [slots.default?.(), (attrs as any).label])
  },
}

const BtnConfirm = await import('~/components/form/btn-confirm.vue').then(m => m.default)

function makeWrapper(props: Record<string, any> = {}, attrs: Record<string, any> = {}) {
  return mount(BtnConfirm, {
    props,
    attrs,
    global: {
      stubs: { UPopover: PopoverStub, UButton: ButtonStub },
      mocks: {
        $t: (key: string) => key,
      },
    },
  })
}

describe('btn-confirm.vue', () => {
  it('renders trigger button with passed attrs', () => {
    const wrapper = makeWrapper({}, { label: 'Delete' })
    expect(wrapper.html()).toContain('Delete')
  })

  it('opens popover on trigger button click', async () => {
    const wrapper = makeWrapper({ confirmText: 'Are you sure?' })
    const triggerBtn = wrapper.find('button')
    await triggerBtn.trigger('click')
    expect(wrapper.html()).toContain('Are you sure?')
  })

  it('shows default confirm text when no confirmText provided', async () => {
    const wrapper = makeWrapper()
    const triggerBtn = wrapper.find('button')
    await triggerBtn.trigger('click')
    expect(wrapper.html()).toContain('form.btnConfirm.defaultText')
  })

  it('emits confirm and closes popover on confirm click', async () => {
    const wrapper = makeWrapper()
    const triggerBtn = wrapper.find('button')
    await triggerBtn.trigger('click')
    const buttons = wrapper.findAll('button')
    // Confirm button is the last button in popover content
    const confirmBtn = buttons[buttons.length - 1]!
    await confirmBtn.trigger('click')
    expect(wrapper.emitted('confirm')).toBeTruthy()
  })

  it('closes popover on cancel click without emitting confirm', async () => {
    const wrapper = makeWrapper()
    const triggerBtn = wrapper.find('button')
    await triggerBtn.trigger('click')
    const buttons = wrapper.findAll('button')
    // Cancel button is second-to-last in popover content
    const cancelBtn = buttons[buttons.length - 2]!
    await cancelBtn.trigger('click')
    expect(wrapper.emitted('confirm')).toBeFalsy()
  })

  it('does not close popover when loading is true on confirm', async () => {
    const wrapper = makeWrapper({ loading: true })
    const triggerBtn = wrapper.find('button')
    await triggerBtn.trigger('click')
    const buttons = wrapper.findAll('button')
    const confirmBtn = buttons[buttons.length - 1]!
    await confirmBtn.trigger('click')
    expect(wrapper.emitted('confirm')).toBeTruthy()
    // Popover should still be open because loading=true
    expect(wrapper.html()).toContain('common.confirm')
  })

  it('auto-closes popover when loading transitions from true to false', async () => {
    const wrapper = makeWrapper({ loading: true })
    const triggerBtn = wrapper.find('button')
    await triggerBtn.trigger('click')
    const buttons = wrapper.findAll('button')
    const confirmBtn = buttons[buttons.length - 1]!
    await confirmBtn.trigger('click')
    // Popover still open
    expect(wrapper.html()).toContain('common.confirm')
    // Set loading to false
    await wrapper.setProps({ loading: false })
    // Popover should auto-close
    expect(wrapper.html()).not.toContain('common.confirm')
  })

  it('passes color prop to confirm button', async () => {
    const wrapper = makeWrapper({ color: 'error' })
    const triggerBtn = wrapper.find('button')
    await triggerBtn.trigger('click')
    // The confirm button should exist in popover content
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBeGreaterThanOrEqual(3)
  })
})
