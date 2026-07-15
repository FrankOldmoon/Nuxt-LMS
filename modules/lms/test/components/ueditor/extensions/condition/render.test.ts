/**
 * condition render component test
 * @see modules/lms/components/ueditor/extensions/nodes/vue/condition/render.vue
 *
 * useConditionRender returns directly (non provide/inject), uses useAuth + useAuthLms
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n, setMockAuthUser } from '../../../../../../../test/setup/nuxt-stubs'

// Stub useAuthLms (not in nuxt-stubs) — condition/render.vue uses it via useConditionRender
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
})

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  setMockAuthUser({ id: 1, name: 'Student' }, [{ code: 'student' }])
})

const _globalStubs = {
  ueditorRender: { template: '<div class="ueditor-render-stub" />', props: ['json'] },
  UIcon: { template: '<span />', props: ['name'] },
  UBadge: { template: '<span><slot /></span>', props: ['variant', 'size'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('condition/render.vue', () => {
  it('renders content when condition met (no conditions)', async () => {
    const { default: ConditionRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/condition/render.vue'
    )
    const config = { conditions: [], content: { type: 'doc', content: [] } }
    const wrapper = mount(ConditionRender, {
      props: { node: { attrs: { content: JSON.stringify(config) } } },
      global: _globalConfig,
    })
    await flushPromises()
    // No conditions → conditionMet=true, content exists → renders ueditorRender
    expect(wrapper.find('.ueditor-render-stub').exists()).toBe(true)
  })

  it('shows locked overlay when role condition not met', async () => {
    const { default: ConditionRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/condition/render.vue'
    )
    const config = {
      conditions: [{ type: 'role', value: 'admin', label: 'Admin' }],
      content: { type: 'doc', content: [] },
    }
    const wrapper = mount(ConditionRender, {
      props: { node: { attrs: { content: JSON.stringify(config) } } },
      global: _globalConfig,
    })
    await flushPromises()
    // User is student, role condition requires admin → conditionMet=false → shows locked
    expect(wrapper.find('.condition-locked').exists()).toBe(true)
    expect(wrapper.text()).toContain('ueditor.conditionDenied')
  })

  it('shows hint when no content and needs hover check', async () => {
    const { default: ConditionRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/condition/render.vue'
    )
    const config = {
      conditions: [{ type: 'question', value: ['1'], label: '#1' }],
      content: '',
    }
    const wrapper = mount(ConditionRender, {
      props: { node: { attrs: { content: JSON.stringify(config) } } },
      global: _globalConfig,
    })
    await flushPromises()
    // question condition → needsHoverCheck=true, content empty → shows hint
    expect(wrapper.find('.condition-hint').exists()).toBe(true)
    expect(wrapper.text()).toContain('ueditor.conditionHint')
  })
})
