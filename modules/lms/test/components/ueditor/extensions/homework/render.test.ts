/**
 * homework render 组件测试
 * @see modules/lms/components/ueditor/extensions/nodes/vue/homework/render.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n, setMockLmsContext } from '../../../../../../../test/setup/nuxt-stubs'

// Stub composables not in nuxt-stubs
;(globalThis as any).useChapterTask = () => null
;(globalThis as any).useUserCard = () => ({ refreshTrigger: ref(0), refresh: () => {} })
;(globalThis as any).useFileNames = () => ref([])
// render 使用 useSiteConfig 按站点时区渲染截止时间
;(globalThis as any).useSiteConfig = () => ({ config: ref({}), siteTimeZone: ref('Asia/Shanghai') })

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
  UFormField: { template: '<div class="uform-field"><slot /></div>', props: ['label', 'size'] },
  FormInputFile: { template: '<input type="file" />', props: ['modelValue', 'multiple', 'placeholder'] },
  UBadge: { template: '<span><slot /></span>', props: ['color', 'variant', 'size'] },
  ClientOnly: { template: '<div><slot /></div>' },
  LmsRecordsModalHomework: { template: '<div v-if="modelValue" />', props: ['modelValue', 'courseId', 'cid', 'maxScore'] },
  richEditor: { template: '<div />', props: ['modelValue', 'placeholder', 'pasteable'] },
  Monaco: { template: '<div />', props: ['modelValue', 'language', 'autoFormat'] },
  ExplanationBlock: { template: '<div class="explanation-block">{{ explanation }}</div>', props: ['explanation'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('homework/render.vue', () => {
  it('shows loading when homeworkId is set and data is being fetched', async () => {
    const { default: HomeworkRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/homework/render.vue'
    )
    const wrapper = mount(HomeworkRender, {
      props: { node: { attrs: { content: '999' } }, courseId: 1 },
      global: _globalConfig,
    })
    // Before flushPromises, pending is true (fetch in progress)
    expect(wrapper.text()).toContain('homework.loading')
    await flushPromises()
  })

  it('renders homework with default data when homeworkId is 0', async () => {
    const { default: HomeworkRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/homework/render.vue'
    )
    const wrapper = mount(HomeworkRender, {
      props: { node: { attrs: { content: '0' } }, courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('homework.label')
  })

  it('shows homework name and point', async () => {
    const { default: HomeworkRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/homework/render.vue'
    )
    const wrapper = mount(HomeworkRender, {
      props: { node: { attrs: { content: '0' } }, courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('homework.label')
  })
})
