/**
 * homework index 组件测试 (TipTap node-view)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/homework/index.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, reactive } from 'vue'
import { resetAllStubs, setMockI18n, setMockLmsContext } from '../../../../../../../test/setup/nuxt-stubs'

// Stub composables not in nuxt-stubs
;(globalThis as any).useChapterTask = () => null
;(globalThis as any).useUserCard = () => ({ refreshTrigger: ref(0), refresh: () => {} })
;(globalThis as any).useFileNames = () => ref([])

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  setMockLmsContext(1, 1)
})

const _globalStubs = {
  ueditorRender: { template: '<div class="ueditor-render-stub" />', props: ['json', 'courseId'] },
  UButton: { template: '<button @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label'] },
  UIcon: { template: '<span />', props: ['name'] },
  UModal: { template: '<div v-if="open"><slot name="content" /></div>', props: ['open', 'scrollable'] },
  UInput: { template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'type', 'placeholder', 'size'] },
  UInputTags: { template: '<div />', props: ['modelValue', 'placeholder'] },
  UFormField: { template: '<div><slot /></div>', props: ['label', 'size'] },
  FormInputFile: { template: '<input type="file" />', props: ['modelValue', 'multiple', 'placeholder'] },
  UBadge: { template: '<span><slot /></span>', props: ['color', 'variant', 'size'] },
  ClientOnly: { template: '<div><slot /></div>' },
  LmsRecordsModalHomework: { template: '<div v-if="modelValue" />', props: ['modelValue', 'courseId', 'cid', 'maxScore'] },
  richEditor: { template: '<div />', props: ['modelValue', 'placeholder', 'pasteable'] },
  Monaco: { template: '<div />', props: ['modelValue', 'language', 'autoFormat'] },
  ExplanationBlock: { template: '<div>{{ explanation }}</div>', props: ['explanation'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('homework/index.vue', () => {
  it('mounts and sets meta title/icon', async () => {
    const { default: HomeworkIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/homework/index.vue'
    )
    const meta = reactive({ title: '', icon: '', hasSettings: false })
    const wrapper = mount(HomeworkIndex, {
      props: {
        node: { attrs: { content: '1' } },
        updateAttributes: () => {},
      },
      global: {
        ..._globalConfig,
        provide: {
          nodeViewShowConfig: ref(false),
          nodeViewMeta: meta,
        },
      },
    })
    await flushPromises()
    expect(meta.title).toBe('homework.label')
    expect(meta.icon).toBe('i-lucide-book-open')
    expect(meta.hasSettings).toBe(true)
  })

  it('renders the homework node wrapper', async () => {
    const { default: HomeworkIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/homework/index.vue'
    )
    const wrapper = mount(HomeworkIndex, {
      props: {
        node: { attrs: { content: '1' } },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.homework-node').exists()).toBe(true)
  })
})
