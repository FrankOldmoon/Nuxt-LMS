/**
 * condition index 组件测试 (TipTap node-view)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/condition/index.vue
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, reactive } from 'vue'
import { resetAllStubs, setMockI18n, setMockLmsContext, setMockAuthUser, provide } from '../../../../../../../test/setup/nuxt-stubs'

// Stub composables not in nuxt-stubs (condition/render.vue uses useAuthLms via useConditionRender)
;(globalThis as any).useAuthLms = () => ({
  classIds: ref([]),
  editorCourseIds: ref([]),
  teacherCourseIds: ref([]),
  user: ref(null),
  roles: ref([]),
  permissions: ref([]),
  isLoggedIn: ref(false),
  hasRole: () => false,
  hasAnyRole: () => false,
  hasPermission: () => false,
  isCourseEditor: () => false,
  isCourseTeacher: () => false,
  isCourseStaff: () => false,
  canEditCourse: () => false,
})

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  setMockLmsContext(1, 1)
  setMockAuthUser({ id: 1, name: 'User' }, [{ code: 'student' }])
})

const _globalStubs = {
  ueditorRender: { template: '<div class="ueditor-render-stub" />', props: ['json'] },
  UButton: { template: '<button @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label'] },
  UIcon: { template: '<span />', props: ['name'] },
  USelect: { template: '<select><option v-for="opt in items" :key="opt.value" :value="opt.value">{{ opt.label }}</option></select>', props: ['modelValue', 'items', 'size', 'multiple'] },
  USeparator: { template: '<hr />' },
  UFormField: { template: '<div><slot /></div>', props: ['label', 'size'] },
  UBadge: { template: '<span><slot /></span>', props: ['variant', 'size'] },
  RichEditor: { template: '<div class="rich-editor" />', props: ['modelValue'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('condition/index.vue', () => {
  it('mounts and sets meta title/icon', async () => {
    const { default: ConditionIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/condition/index.vue'
    )
    const meta = reactive({ title: '', icon: '', hasSettings: false })
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', meta)
    const wrapper = mount(ConditionIndex, {
      props: {
        node: { attrs: { content: JSON.stringify({ conditions: [], content: '' }) } },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(meta.title).toBe('ueditor.condition')
    expect(meta.icon).toBe('i-lucide-shield-check')
    expect(meta.hasSettings).toBe(true)
  })

  it('renders the condition node body', async () => {
    const { default: ConditionIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/condition/index.vue'
    )
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))
    const wrapper = mount(ConditionIndex, {
      props: {
        node: { attrs: { content: JSON.stringify({ conditions: [], content: '' }) } },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.vue-node-body').exists()).toBe(true)
  })

  it('calls updateAttributes when config changes', async () => {
    const { default: ConditionIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/condition/index.vue'
    )
    const updateAttributes = vi.fn()
    provide('nodeViewShowConfig', ref(false))
    provide('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))
    const wrapper = mount(ConditionIndex, {
      props: {
        node: { attrs: { content: JSON.stringify({ conditions: [], content: '' }) } },
        updateAttributes,
      },
      global: _globalConfig,
    })
    await flushPromises()
    const vm = wrapper.vm as any
    vm.onConfigChange({ conditions: [{ type: 'role', value: 'admin' }], content: '<p>test</p>' })
    await flushPromises()
    expect(updateAttributes).toHaveBeenCalledWith({
      content: JSON.stringify({ conditions: [{ type: 'role', value: 'admin' }], content: '<p>test</p>' }),
    })
  })
})
