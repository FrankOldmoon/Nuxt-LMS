/**
 * navEditor/index.vue component test
 * @see modules/lms/components/navEditor/index.vue
 *
 * Nav editor: modal + list + batch import
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  // stub useNavEditor
  ;(globalThis as any).useNavEditor = (_props: any, _emit: any) => ({
    open: ref(false),
    flatItems: ref([]),
    saving: ref(false),
    maxDepth: ref(2),
    genKey: () => 0,
    importOpen: ref(false),
    importText: ref(''),
    aiPrompt: ref(''),
    aiGenerating: ref(false),
    resetFromProps: vi.fn(),
    doBatchImport: vi.fn(),
    aiGenerate: vi.fn(),
    openModal: vi.fn(),
    cancel: vi.fn(),
    save: vi.fn(async () => {}),
  })
})

const _globalStubs = {
  UModal: {
    template: '<div><slot /><div v-if="open" class="modal"><slot name="content" /></div></div>',
    props: ['open'],
  },
  UTooltip: { template: '<span class="utooltip"><slot /></span>', props: ['text', 'content'] },
  UButton: {
    template: '<button class="ubutton" :data-loading="loading" :disabled="disabled" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>',
    props: ['icon', 'color', 'variant', 'size', 'loading', 'disabled', 'label', 'aria-label'],
  },
  NavEditorList: { template: '<div class="nav-editor-list" />', props: ['modelValue', 'maxDepth', 'genKey'] },
  NavEditorImportModal: { template: '<div class="nav-editor-import-modal" />', props: ['open', 'text', 'prompt', 'generating'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('navEditor/index.vue', () => {
  const sampleNavigation = [{ label: 'Home', to: '/' }]

  it('渲染触发器按钮', async () => {
    const { default: NavEditor } = await import('../../../components/navEditor/index.vue')
    const wrapper = mount(NavEditor, {
      props: { mode: 'course', courseId: '1', navigation: sampleNavigation },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.ubutton').exists()).toBe(true)
  })

  it('open=true 时渲染弹窗', async () => {
    ;(globalThis as any).useNavEditor = (_props: any, _emit: any) => ({
      open: ref(true), flatItems: ref([]), saving: ref(false), maxDepth: ref(2),
      genKey: () => 0, importOpen: ref(false), importText: ref(''),
      aiPrompt: ref(''), aiGenerating: ref(false),
      resetFromProps: vi.fn(), doBatchImport: vi.fn(), aiGenerate: vi.fn(),
      openModal: vi.fn(), cancel: vi.fn(), save: vi.fn(async () => {}),
    })
    const { default: NavEditor } = await import('../../../components/navEditor/index.vue')
    const wrapper = mount(NavEditor, {
      props: { mode: 'course', courseId: '1', navigation: sampleNavigation },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(true)
  })

  it('mode=category 时显示分类标题', async () => {
    ;(globalThis as any).useNavEditor = (_props: any, _emit: any) => ({
      open: ref(true), flatItems: ref([]), saving: ref(false), maxDepth: ref(1),
      genKey: () => 0, importOpen: ref(false), importText: ref(''),
      aiPrompt: ref(''), aiGenerating: ref(false),
      resetFromProps: vi.fn(), doBatchImport: vi.fn(), aiGenerate: vi.fn(),
      openModal: vi.fn(), cancel: vi.fn(), save: vi.fn(async () => {}),
    })
    const { default: NavEditor } = await import('../../../components/navEditor/index.vue')
    const wrapper = mount(NavEditor, {
      props: { mode: 'category', navigation: sampleNavigation },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('navEditor.editCategory')
  })

  it('mode=course 时显示课程标题', async () => {
    ;(globalThis as any).useNavEditor = (_props: any, _emit: any) => ({
      open: ref(true), flatItems: ref([]), saving: ref(false), maxDepth: ref(2),
      genKey: () => 0, importOpen: ref(false), importText: ref(''),
      aiPrompt: ref(''), aiGenerating: ref(false),
      resetFromProps: vi.fn(), doBatchImport: vi.fn(), aiGenerate: vi.fn(),
      openModal: vi.fn(), cancel: vi.fn(), save: vi.fn(async () => {}),
    })
    const { default: NavEditor } = await import('../../../components/navEditor/index.vue')
    const wrapper = mount(NavEditor, {
      props: { mode: 'course', courseId: '1', navigation: sampleNavigation },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('navEditor.editCourse')
  })

  it('正确接收 props', async () => {
    const { default: NavEditor } = await import('../../../components/navEditor/index.vue')
    const wrapper = mount(NavEditor, {
      props: { mode: 'course', courseId: '42', navigation: sampleNavigation },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('mode')).toBe('course')
    expect(wrapper.props('courseId')).toBe('42')
    expect(wrapper.props('navigation')).toEqual(sampleNavigation)
  })

  it('open=true 时渲染 NavEditorList', async () => {
    ;(globalThis as any).useNavEditor = (_props: any, _emit: any) => ({
      open: ref(true), flatItems: ref([]), saving: ref(false), maxDepth: ref(2),
      genKey: () => 0, importOpen: ref(false), importText: ref(''),
      aiPrompt: ref(''), aiGenerating: ref(false),
      resetFromProps: vi.fn(), doBatchImport: vi.fn(), aiGenerate: vi.fn(),
      openModal: vi.fn(), cancel: vi.fn(), save: vi.fn(async () => {}),
    })
    const { default: NavEditor } = await import('../../../components/navEditor/index.vue')
    const wrapper = mount(NavEditor, {
      props: { mode: 'course', courseId: '1', navigation: sampleNavigation },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.nav-editor-list').exists()).toBe(true)
  })
})
