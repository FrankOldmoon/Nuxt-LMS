/**
 * ai-generator 编辑组件测试 (edit)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/edit/ai-generator.vue
 *
 * ai-generator.vue 使用 useAiGenerator composable（fetch 流式生成）
 * 测试 mount + 初始状态（不实际触发 fetch）
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UButton: { template: '<button @click="$emit(\'click\')">{{ label }}<slot /></button>', props: ['variant', 'size', 'color', 'icon', 'loading', 'disabled', 'label'] },
  UInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @keydown.enter="$emit(\'keydown\', $event)" />',
    props: ['modelValue', 'placeholder', 'size', 'disabled'],
    emits: ['update:modelValue', 'keydown'],
  },
  UIcon: { template: '<span class="icon" />', props: ['name'] },
}

const _mocks = { $t: (k: string) => k }

describe('question/edit/ai-generator.vue', () => {
  it('mounts and renders title and generate button', async () => {
    const { default: AiGenerator } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/ai-generator.vue'
    )
    const wrapper = mount(AiGenerator, {
      props: { type: 'single' },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    expect(wrapper.text()).toContain('question.aiGenerateTitle')
    expect(wrapper.text()).toContain('question.aiGenerateBtn')
  })

  it('accepts type prop', async () => {
    const { default: AiGenerator } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/ai-generator.vue'
    )
    const wrapper = mount(AiGenerator, {
      props: { type: 'multiple' },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    expect(wrapper.props('type')).toBe('multiple')
  })

  it('does not show stop button when not generating', async () => {
    const { default: AiGenerator } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/edit/ai-generator.vue'
    )
    const wrapper = mount(AiGenerator, {
      props: { type: 'single' },
      global: { stubs: _globalStubs, mocks: _mocks },
    })
    // common.stop 只在 generating 时显示
    expect(wrapper.text()).not.toContain('common.stop')
  })
})
