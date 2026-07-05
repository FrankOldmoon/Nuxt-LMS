import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

const TooltipStub = {
  name: 'UTooltip',
  inheritAttrs: false,
  setup(_: any, { slots, attrs }: any) {
    return () => h('div', { 'data-tooltip': (attrs as any).text }, slots.default?.())
  },
}

const IconStub = {
  name: 'UIcon',
  inheritAttrs: false,
  setup(_: any, { attrs }: any) {
    return () => h('i', { class: attrs.name, 'data-icon': attrs.name })
  },
}

const TaskDot = await import('~/components/course/taskDot.vue').then(m => m.default)

function makeWrapper(props: Record<string, any> = {}) {
  return mount(TaskDot, {
    props,
    global: {
      stubs: { UTooltip: TooltipStub, UIcon: IconStub },
      mocks: {
        $t: (key: string) => key,
      },
    },
  })
}

describe('taskDot.vue', () => {
  it('renders question icon for type=question', () => {
    const wrapper = makeWrapper({ type: 'question', status: 'todo' })
    expect(wrapper.html()).toContain('i-lucide-help-circle')
  })

  it('renders homework icon for type=homework', () => {
    const wrapper = makeWrapper({ type: 'homework', status: 'todo' })
    expect(wrapper.html()).toContain('i-lucide-file-text')
  })

  it('renders comment icon for type=comment', () => {
    const wrapper = makeWrapper({ type: 'comment', status: 'todo' })
    expect(wrapper.html()).toContain('i-lucide-message-circle')
  })

  it('renders no icon for unknown type', () => {
    const wrapper = makeWrapper({ type: 'unknown', status: 'todo' })
    expect(wrapper.html()).not.toContain('i-lucide-help-circle')
    expect(wrapper.html()).not.toContain('i-lucide-file-text')
    expect(wrapper.html()).not.toContain('i-lucide-message-circle')
  })

  it('applies done status class (green)', () => {
    const wrapper = makeWrapper({ type: 'question', status: 'done' })
    expect(wrapper.html()).toContain('bg-green-500')
  })

  it('applies partial status class (yellow)', () => {
    const wrapper = makeWrapper({ type: 'question', status: 'partial' })
    expect(wrapper.html()).toContain('bg-yellow-400')
  })

  it('applies todo/default status class (gray)', () => {
    const wrapper = makeWrapper({ type: 'question', status: 'todo' })
    expect(wrapper.html()).toContain('bg-gray-200')
  })

  it('applies default status class for unknown status', () => {
    const wrapper = makeWrapper({ type: 'question', status: 'unknown' })
    expect(wrapper.html()).toContain('bg-gray-200')
  })

  it('emits click with props on dot click', async () => {
    const wrapper = makeWrapper({ type: 'question', status: 'todo', id: 42 })
    const dot = wrapper.find('.cursor-pointer')
    await dot.trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
    const emittedProps = wrapper.emitted('click')![0][0] as Record<string, any>
    expect(emittedProps).toMatchObject({ type: 'question', status: 'todo', id: 42 })
  })

  it('shows tooltip with status text for done', () => {
    const wrapper = makeWrapper({ type: 'question', status: 'done' })
    expect(wrapper.html()).toContain('coursePanel.done')
  })

  it('shows partial tooltip text', () => {
    const wrapper = makeWrapper({ type: 'question', status: 'partial' })
    expect(wrapper.html()).toContain('coursePanel.partial')
  })

  it('shows todo tooltip text', () => {
    const wrapper = makeWrapper({ type: 'question', status: 'todo' })
    expect(wrapper.html()).toContain('coursePanel.todo')
  })
})
