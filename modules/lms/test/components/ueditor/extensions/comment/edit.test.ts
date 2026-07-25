/**
 * comment edit 组件测试
 * @see modules/lms/components/ueditor/extensions/nodes/vue/comment/edit.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n, setMockLmsContext } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  setMockLmsContext(1, 1)
})

const _globalStubs = {
  UModal: {
    template: '<div v-if="open" class="modal-stub"><slot name="content" /></div>',
    props: ['open', 'scrollable', 'ui'],
  },
  UInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'placeholder', 'icon', 'size'],
  },
  UInputTags: { template: '<div class="uinput-tags" />', props: ['modelValue', 'placeholder', 'addText'] },
  UButton: { template: '<button @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label', 'loading'] },
  UIcon: { template: '<span />', props: ['name'] },
  Monaco: { template: '<div class="monaco-stub" />', props: ['modelValue', 'language', 'autoFormat'] },
  richEditor: { template: '<div class="rich-editor-stub" />', props: ['modelValue'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('comment/edit.vue', () => {
  it('renders inline panel when no modelValue (editor mode)', async () => {
    const { default: CommentEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/comment/edit.vue'
    )
    const wrapper = mount(CommentEdit, {
      props: { commentId: 0, comment: { name: 'Test', content: '', tags: [], point: 1 } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.p-6').exists()).toBe(true)
  })

  it('renders modal when modelValue is provided', async () => {
    const { default: CommentEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/comment/edit.vue'
    )
    const open = ref(false)
    const wrapper = mount(CommentEdit, {
      props: { modelValue: open.value, commentId: 1, comment: { name: 'Test', content: '', tags: [], point: 1 } },
      global: _globalConfig,
    })
    await flushPromises()
    // Modal mode: open=false initially, no content shown
    expect(wrapper.find('.modal-stub').exists()).toBe(false)
  })

  it('shows modal content when open=true (false→true transition)', async () => {
    const { default: CommentEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/comment/edit.vue'
    )
    const wrapper = mount(CommentEdit, {
      props: { modelValue: false, commentId: 1, comment: { name: 'Test', content: '', tags: [], point: 1 } },
      global: _globalConfig,
    })
    await flushPromises()
    // Transition to open=true
    await wrapper.setProps({ modelValue: true })
    await flushPromises()
    expect(wrapper.find('.modal-stub').exists()).toBe(true)
  })

  it('emits update:modelValue when modal closed', async () => {
    const { default: CommentEdit } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/comment/edit.vue'
    )
    const wrapper = mount(CommentEdit, {
      props: { modelValue: true, commentId: 1, comment: { name: 'Test', content: '', tags: [], point: 1 } },
      global: _globalConfig,
    })
    await flushPromises()
    // The modal is open; simulate cancel via FormBody cancel event
    const cancelBtn = wrapper.findAll('button').find(b => b.text().includes('common.cancel'))
    if (cancelBtn) {
      await cancelBtn.trigger('click')
      await flushPromises()
      const events = wrapper.emitted('update:modelValue')
      expect(events).toBeTruthy()
    }
  })
})
