/**
 * course/editor/index.vue 组件测试
 * @see modules/lms/components/course/editor/index.vue
 *
 * 课程编辑器弹窗：UModal + 内容编辑 + 基础信息 + 配置 + 成员管理
 * 重点测试：能否挂载、能否接收 props
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n, setMockAuthUser } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  // stub useCourseEditor
  ;(globalThis as any).useCourseEditor = (_props: any, _emit: any) => ({
    open: ref(false),
    loading: ref(false),
    saving: ref(false),
    canEdit: ref(true),
    lockId: ref('courses_1'),
    form: ref({ name: '', code: '', tags: [] }),
    contentJson: ref(null),
    configFormRef: ref(null),
    membersRef: ref(null),
    openModal: vi.fn(),
    closeModal: vi.fn(),
    save: vi.fn(async () => {}),
  })
})

const _globalStubs = {
  UModal: {
    template: '<div><slot /><div v-if="open" class="modal"><slot name="content" /></div></div>',
    props: ['open', 'ui'],
  },
  UTooltip: { template: '<span class="utooltip"><slot /></span>', props: ['text', 'content'] },
  UButton: {
    template: '<button class="ubutton" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['color', 'variant', 'size', 'icon', 'disabled', 'aria-label', 'loading', 'label'],
  },
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  UInput: {
    template: '<input class="uinput" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder'],
  },
  UInputTags: { template: '<div class="uinput-tags" />', props: ['modelValue', 'placeholder'] },
  UFormField: {
    template: '<div class="uform-field"><label v-if="label">{{ label }}</label><slot /></div>',
    props: ['label'],
  },
  USeparator: { template: '<div class="useparator" />', props: ['label'] },
  richEditor: { template: '<div class="rich-editor" />', props: ['modelValue', 'lockId'] },
  CourseEditorConfigForm: { template: '<div class="config-form" />' },
  CourseEditorMembersManager: { template: '<div class="members-manager" />' },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('course/editor/index.vue', () => {
  it('正确接收 courseId prop', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin' }], [])
    const { default: CourseEditor } = await import('../../../../components/course/editor/index.vue')
    const wrapper = mount(CourseEditor, {
      props: { courseId: 42 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('courseId')).toBe(42)
  })

  it('渲染编辑按钮（触发器）', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin' }], [])
    const { default: CourseEditor } = await import('../../../../components/course/editor/index.vue')
    const wrapper = mount(CourseEditor, {
      props: { courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.ubutton').exists()).toBe(true)
  })

  it('canEdit=false 时编辑按钮禁用', async () => {
    ;(globalThis as any).useCourseEditor = (_props: any, _emit: any) => ({
      open: ref(false), loading: ref(false), saving: ref(false),
      canEdit: ref(false), lockId: ref(''), form: ref({ name: '', code: '', tags: [] }),
      contentJson: ref(null), configFormRef: ref(null), membersRef: ref(null),
      openModal: vi.fn(), closeModal: vi.fn(), save: vi.fn(async () => {}),
    })
    const { default: CourseEditor } = await import('../../../../components/course/editor/index.vue')
    const wrapper = mount(CourseEditor, {
      props: { courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    const btn = wrapper.find('.ubutton')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('admin 用户渲染成员管理组件', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin' }], [])
    // 让 modal 打开
    ;(globalThis as any).useCourseEditor = (_props: any, _emit: any) => ({
      open: ref(true), loading: ref(false), saving: ref(false),
      canEdit: ref(true), lockId: ref(''), form: ref({ name: '', code: '', tags: [] }),
      contentJson: ref(null), configFormRef: ref(null), membersRef: ref(null),
      openModal: vi.fn(), closeModal: vi.fn(), save: vi.fn(async () => {}),
    })
    const { default: CourseEditor } = await import('../../../../components/course/editor/index.vue')
    const wrapper = mount(CourseEditor, {
      props: { courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.members-manager').exists()).toBe(true)
  })

  it('非 admin 用户不渲染成员管理组件', async () => {
    setMockAuthUser({ id: 2, name: 'teacher' }, [{ code: 'teacher' }], [])
    ;(globalThis as any).useCourseEditor = (_props: any, _emit: any) => ({
      open: ref(true), loading: ref(false), saving: ref(false),
      canEdit: ref(true), lockId: ref(''), form: ref({ name: '', code: '', tags: [] }),
      contentJson: ref(null), configFormRef: ref(null), membersRef: ref(null),
      openModal: vi.fn(), closeModal: vi.fn(), save: vi.fn(async () => {}),
    })
    const { default: CourseEditor } = await import('../../../../components/course/editor/index.vue')
    const wrapper = mount(CourseEditor, {
      props: { courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.members-manager').exists()).toBe(false)
  })
})
