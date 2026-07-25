/**
 * video 编辑组件测试 (edit)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/edit/video.vue
 *
 * video.vue 接收 form prop，使用 FormInputFile/UFormField/UeditorContentPicker
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UFormField: { template: '<div class="u-form-field"><slot /></div>', props: ['label', 'size'] },
  FormInputFile: { template: '<div class="form-input-file" />', props: ['modelValue', 'placeholder', 'multiple'] },
  UButton: { template: '<button @click="$emit(\'click\')">{{ label }}<slot /></button>', props: ['variant', 'size', 'color', 'icon', 'label'] },
  UIcon: { template: '<span class="icon" />', props: ['name'] },
  UInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder', 'size', 'type'],
    emits: ['update:modelValue'],
  },
  UeditorContentPicker: { template: '<div class="picker" />', props: ['modelValue', 'type'], emits: ['update:modelValue', 'confirm'] },
}

const _mocks = { $t: (k: string) => k }

describe('question/edit/video.vue', () => {
  it('mounts and initializes options as {src, questions}', async () => {
    const { default: VideoEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/video.vue'
    )
    const form = { options: null }
    mount(VideoEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    expect(form.options).toEqual({ src: '', questions: [] })
  })

  it('renders video preview when src is present', async () => {
    const { default: VideoEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/video.vue'
    )
    const form = { options: { src: 'http://example.com/v.mp4', questions: [] } }
    const wrapper = mount(VideoEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    expect(wrapper.find('video').exists()).toBe(true)
  })

  it('renders question picker button', async () => {
    const { default: VideoEditor } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/video.vue'
    )
    const form = { options: { src: '', questions: [] } }
    const wrapper = mount(VideoEditor, {
      props: { form },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    expect(wrapper.find('.picker').exists()).toBe(true)
  })
})
