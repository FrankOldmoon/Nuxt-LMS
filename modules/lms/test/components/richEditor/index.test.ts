/**
 * richEditor/index.vue component test
 * @see modules/lms/components/richEditor/index.vue
 *
 * Rich text editor: string mode (UTextarea) + JSON mode (ueditorRender) + edit modal
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

// mock useRichEditor (local import)
vi.mock('../../../components/richEditor/useRichEditor', () => ({
  useRichEditor: (props: any, model: any) => {
    const { ref, computed }: any = globalThis as any
    return {
      isJson: computed(() => typeof model.value === 'object' && model.value !== null),
      isModalOpen: ref(false),
      editJson: ref(null),
      openEditor: vi.fn(),
      saveJson: vi.fn(),
      switchToTextMode: vi.fn(),
    }
  },
}))

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UModal: {
    template: '<div v-if="open" class="modal"><slot name="body" /></div>',
    props: ['open', 'fullscreen', 'scrollable'],
  },
  UButton: {
    template: '<button class="ubutton" :data-loading="loading" :aria-label="ariaLabel" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>',
    props: ['icon', 'label', 'color', 'variant', 'size', 'loading', 'ariaLabel'],
  },
  UTextarea: {
    template: '<textarea class="utextarea" :value="modelValue" :rows="rows" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'rows', 'placeholder'],
  },
  ueditor: { template: '<div class="ueditor" />', props: ['modelValue', 'pasteable'] },
  ueditorRender: { template: '<div class="ueditor-render" />', props: ['json'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('richEditor/index.vue', () => {
  it('字符串模式渲染 UTextarea', async () => {
    const { default: RichEditor } = await import('../../../components/richEditor/index.vue')
    const wrapper = mount(RichEditor, {
      props: { modelValue: 'hello world' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.utextarea').exists()).toBe(true)
  })

  it('字符串模式渲染打开编辑器按钮', async () => {
    const { default: RichEditor } = await import('../../../components/richEditor/index.vue')
    const wrapper = mount(RichEditor, {
      props: { modelValue: 'hello' },
      global: _globalConfig,
    })
    await flushPromises()
    const buttons = wrapper.findAll('.ubutton')
    // String mode has an open editor button
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })

  it('JSON 模式渲染 ueditorRender', async () => {
    const { default: RichEditor } = await import('../../../components/richEditor/index.vue')
    const wrapper = mount(RichEditor, {
      props: { modelValue: { type: 'doc', content: [] } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.ueditor-render').exists()).toBe(true)
    // Textarea in string mode is not shown
    expect(wrapper.find('.utextarea').exists()).toBe(false)
  })

  it('JSON 模式渲染编辑按钮', async () => {
    const { default: RichEditor } = await import('../../../components/richEditor/index.vue')
    const wrapper = mount(RichEditor, {
      props: { modelValue: { type: 'doc', content: [] } },
      global: _globalConfig,
    })
    await flushPromises()
    const buttons = wrapper.findAll('.ubutton')
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })

  it('JSON 模式 + allowTextMode=true 渲染切换到文本按钮', async () => {
    const { default: RichEditor } = await import('../../../components/richEditor/index.vue')
    const wrapper = mount(RichEditor, {
      props: { modelValue: { type: 'doc', content: [] }, allowTextMode: true },
      global: _globalConfig,
    })
    await flushPromises()
    // JSON mode has 2 buttons: edit button + switch to text button
    const buttons = wrapper.findAll('.ubutton')
    expect(buttons.length).toBe(2)
  })

  it('JSON 模式 + allowTextMode=false 不渲染切换到文本按钮', async () => {
    const { default: RichEditor } = await import('../../../components/richEditor/index.vue')
    const wrapper = mount(RichEditor, {
      props: { modelValue: { type: 'doc', content: [] }, allowTextMode: false },
      global: _globalConfig,
    })
    await flushPromises()
    // Only edit button, no switch to text button
    const buttons = wrapper.findAll('.ubutton')
    expect(buttons.length).toBe(1)
  })
})
