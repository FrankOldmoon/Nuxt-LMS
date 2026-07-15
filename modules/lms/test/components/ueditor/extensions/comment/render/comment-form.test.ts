/**
 * comment-form component test
 * @see modules/lms/components/ueditor/extensions/nodes/vue/comment/render/comment-form.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  richEditor: {
    template: '<div class="rich-editor"><textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /></div>',
    props: ['modelValue', 'placeholder', 'pasteable'],
  },
  UButton: { template: '<button :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>', props: ['color', 'variant', 'size', 'loading', 'label', 'icon', 'disabled'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('comment/render/comment-form.vue', () => {
  it('mounts with default props', async () => {
    const { default: CommentForm } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/comment/render/comment-form.vue'
    )
    const wrapper = mount(CommentForm, { global: _globalConfig })
    expect(wrapper.exists()).toBe(true)
  })

  it('submit button is disabled when content is empty', async () => {
    const { default: CommentForm } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/comment/render/comment-form.vue'
    )
    const wrapper = mount(CommentForm, {
      props: { parentCid: 1, placeholder: 'reply' },
      global: _globalConfig,
    })
    const button = wrapper.find('button')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('emits submit with content and parentCid when clicked', async () => {
    const { default: CommentForm } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/comment/render/comment-form.vue'
    )
    const wrapper = mount(CommentForm, {
      props: { parentCid: 5, placeholder: 'reply' },
      global: _globalConfig,
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('hello world')
    const button = wrapper.find('button')
    expect(button.attributes('disabled')).toBeUndefined()
    await button.trigger('click')
    const submitEvents = wrapper.emitted('submit')
    expect(submitEvents).toHaveLength(1)
    expect(submitEvents![0][0]).toEqual({ content: 'hello world', parentCid: 5 })
  })

  it('clears content after submit', async () => {
    const { default: CommentForm } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/comment/render/comment-form.vue'
    )
    const wrapper = mount(CommentForm, {
      props: { parentCid: 1 },
      global: _globalConfig,
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('temp content')
    await wrapper.find('button').trigger('click')
    expect(textarea.element.value).toBe('')
  })
})
