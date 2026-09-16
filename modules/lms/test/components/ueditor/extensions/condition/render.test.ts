/**
 * condition render 组件测试
 * @see modules/lms/components/ueditor/extensions/nodes/vue/condition/render.vue
 *
 * useConditionRender 直接返回（非 provide/inject），用 useAuth + useAuthLms
 * 规则：条件未满足时保留外层占位卡片，但正文内容完全不渲染；远端条件靠 hover 触发检查
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import {
  resetAllStubs, setMockI18n, setMockAuthUser, setMockFetchHandler,
} from '../../../../../../../test/setup/nuxt-stubs'

// Stub useAuthLms (not in nuxt-stubs) — condition/render.vue uses it via useConditionRender
let _mockClassIds = ref<number[]>([])
;(globalThis as any).useAuthLms = () => ({
  classIds: _mockClassIds,
  editorCourseIds: ref([]),
  teacherCourseIds: ref([]),
  user: ref(null),
  roles: ref([]),
  permissions: ref([]),
  isLoggedIn: ref(true),
  hasRole: () => false,
  hasAnyRole: () => false,
  hasPermission: () => false,
  isCourseEditor: () => false,
  isCourseTeacher: () => false,
})

beforeEach(() => {
  resetAllStubs()
  _mockClassIds = ref([])
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

const CONTENT = { type: 'doc', content: [] }

async function mountRender(config: any) {
  const { default: ConditionRender } = await import(
    '../../../../../components/ueditor/extensions/nodes/vue/condition/render.vue'
  )
  return mount(ConditionRender, {
    props: { node: { attrs: { content: JSON.stringify(config) } } },
    global: _globalConfig,
  })
}

describe('condition/render.vue', () => {
  it('无条件 → 渲染内容', async () => {
    const wrapper = await mountRender({ conditions: [], content: CONTENT })
    await flushPromises()
    expect(wrapper.find('.ueditor-render-stub').exists()).toBe(true)
  })

  it('role 条件未满足 → 内容完全不渲染，只留条件占位', async () => {
    const wrapper = await mountRender({
      conditions: [{ type: 'role', value: 'admin', label: 'Admin' }],
      content: CONTENT,
    })
    await flushPromises()
    expect(wrapper.find('.ueditor-render-stub').exists()).toBe(false)
    expect(wrapper.find('.condition-locked').exists()).toBe(true)
    expect(wrapper.text()).toContain('ueditor.conditionDenied')
  })

  it('class 条件未满足（不在该班级）→ 内容完全不渲染', async () => {
    _mockClassIds.value = [7]
    const wrapper = await mountRender({
      conditions: [{ type: 'class', value: '5', label: '5A' }],
      content: CONTENT,
    })
    await flushPromises()
    expect(wrapper.find('.ueditor-render-stub').exists()).toBe(false)
    expect(wrapper.find('.condition-locked').exists()).toBe(true)
  })

  it('class 条件满足 → 渲染内容', async () => {
    _mockClassIds.value = [5]
    const wrapper = await mountRender({
      conditions: [{ type: 'class', value: '5', label: '5A' }],
      content: CONTENT,
    })
    await flushPromises()
    expect(wrapper.find('.ueditor-render-stub').exists()).toBe(true)
  })

  it('远端条件：hover 时请求接口，met=true → 渲染内容', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ data: { met: true, details: [] }, success: true })
    setMockFetchHandler(fetchSpy)
    const wrapper = await mountRender({
      conditions: [{ type: 'question', value: ['1'], label: '#1' }],
      content: CONTENT,
    })
    await flushPromises()
    // hover 之前不请求、也不渲染内容
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(wrapper.find('.ueditor-render-stub').exists()).toBe(false)

    await wrapper.find('.condition-render-container').trigger('mouseenter')
    await flushPromises()
    await flushPromises()

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy.mock.calls[0][0]).toBe('/api/condition/check')
    expect(wrapper.find('.ueditor-render-stub').exists()).toBe(true)
  })

  it('远端条件：检查请求进行中显示 loading 而非锁定占位', async () => {
    let resolveCheck: (v: any) => void = () => {}
    setMockFetchHandler(vi.fn().mockImplementation(
      () => new Promise((resolve) => { resolveCheck = resolve }),
    ))
    const wrapper = await mountRender({
      conditions: [{ type: 'question', value: ['1'], label: '#1' }],
      content: CONTENT,
    })
    await flushPromises()
    await wrapper.find('.condition-render-container').trigger('mouseenter')

    expect(wrapper.find('.condition-checking').exists()).toBe(true)
    expect(wrapper.find('.condition-locked').exists()).toBe(false)

    resolveCheck({ data: { met: false, details: [] }, success: true })
    await flushPromises()
    await flushPromises()

    expect(wrapper.find('.condition-checking').exists()).toBe(false)
    expect(wrapper.find('.condition-locked').exists()).toBe(true)
  })

  it('远端条件：met=false → 内容完全不渲染', async () => {
    setMockFetchHandler(vi.fn().mockResolvedValue({ data: { met: false, details: [] }, success: true }))
    const wrapper = await mountRender({
      conditions: [{ type: 'homework', value: ['3'], label: '#3' }],
      content: CONTENT,
    })
    await wrapper.find('.condition-render-container').trigger('mouseenter')
    await flushPromises()
    await flushPromises()
    expect(wrapper.find('.ueditor-render-stub').exists()).toBe(false)
    expect(wrapper.find('.condition-locked').exists()).toBe(true)
  })

  it('无内容时显示 hover 提示', async () => {
    const wrapper = await mountRender({
      conditions: [{ type: 'question', value: ['1'], label: '#1' }],
      content: '',
    })
    await flushPromises()
    expect(wrapper.find('.condition-hint').exists()).toBe(true)
    expect(wrapper.find('.ueditor-render-stub').exists()).toBe(false)
  })
})
