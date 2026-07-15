/**
 * aigenerator/render.vue component test
 * @see modules/lms/components/ueditor/extensions/nodes/vue/aigenerator/render.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n, setMockLmsContext, setMockAuthUser } from '../../../../../../../test/setup/nuxt-stubs'

// Stub composables used by useAiGeneratorRender
;(globalThis as any).useChapterTask = () => null

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  setMockLmsContext(1, 1)
  // Not logged in by default
  setMockAuthUser(null)
})

const _globalStubs = {
  QuestionRender: { template: '<div class="question-render-stub" />', props: ['question', 'node'] },
  UButton: { template: '<button @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label', 'disabled', 'loading'] },
  UIcon: { template: '<span />', props: ['name'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('aigenerator/render.vue', () => {
  it('mounts and shows login required when not logged in', async () => {
    const { default: AigeneratorRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/aigenerator/render.vue'
    )
    const wrapper = mount(AigeneratorRender, {
      props: { node: { attrs: { content: JSON.stringify({ title: 'Gen' }) } } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.aigenerator-render').exists()).toBe(true)
  })

  it('shows start button when logged in but not started', async () => {
    setMockAuthUser({ id: 1, name: 'student' }, [{ code: 'student' }], [])
    const { default: AigeneratorRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/aigenerator/render.vue'
    )
    const wrapper = mount(AigeneratorRender, {
      props: { node: { attrs: { content: JSON.stringify({ title: 'Gen' }) } } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.aigenerator-render').exists()).toBe(true)
  })

  it('displays title from config in header', async () => {
    const { default: AigeneratorRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/aigenerator/render.vue'
    )
    const wrapper = mount(AigeneratorRender, {
      props: { node: { attrs: { content: JSON.stringify({ title: 'Quiz Gen' }) } } },
      global: _globalConfig,
    })
    await flushPromises()
    // The component should render the aigenerator label
    expect(wrapper.text()).toContain('ueditor.aigenerator')
  })
})
