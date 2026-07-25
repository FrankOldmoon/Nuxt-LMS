/**
 * course/wrongBook/modal.vue 组件测试
 * @see modules/lms/components/course/wrongBook/modal.vue
 *
 * 错题本弹窗：搜索 + 筛选 + 列表 + 分页
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  // stub useWrongBook
  ;(globalThis as any).useWrongBook = (_props: any, _emit: any) => ({
    items: ref([]),
    total: ref(0),
    page: ref(1),
    pageSize: ref(10),
    loading: ref(false),
    keyword: ref(''),
    filterType: ref(''),
    pageSizeOptions: ref([
      { label: '10', value: 10 },
      { label: '20', value: 20 },
    ]),
    typeOptions: ref([
      { label: 'all', value: '' },
      { label: 'question', value: 'question' },
    ]),
    totalPages: ref(1),
    prevPage: vi.fn(),
    nextPage: vi.fn(),
    refetch: vi.fn(async () => {}),
  })
})

const _globalStubs = {
  UModal: {
    template: '<div v-if="open" class="modal"><slot name="content" /></div>',
    props: ['open', 'ui'],
  },
  UButton: {
    template: '<button class="ubutton" :disabled="disabled" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>',
    props: ['icon', 'color', 'variant', 'size', 'label', 'disabled'],
  },
  UInput: {
    template: '<input class="uinput" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @keydown="$emit(\'keydown\', $event)" />',
    props: ['modelValue', 'placeholder', 'icon', 'size'],
  },
  USelect: {
    template: '<select class="uselect"><option v-for="o in items" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
    props: ['modelValue', 'items', 'size'],
  },
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  CourseWrongBookItem: { template: '<div class="wrong-book-item" />', props: ['item'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('course/wrongBook/modal.vue', () => {
  it('modelValue=true 时渲染弹窗', async () => {
    const { default: WrongBookModal } = await import('../../../../components/course/wrongBook/modal.vue')
    const wrapper = mount(WrongBookModal, {
      props: { modelValue: true, courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(true)
  })

  it('modelValue=false 时不渲染弹窗', async () => {
    const { default: WrongBookModal } = await import('../../../../components/course/wrongBook/modal.vue')
    const wrapper = mount(WrongBookModal, {
      props: { modelValue: false, courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('渲染标题', async () => {
    const { default: WrongBookModal } = await import('../../../../components/course/wrongBook/modal.vue')
    const wrapper = mount(WrongBookModal, {
      props: { modelValue: true, courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('chapter.wrongBook')
  })

  it('loading=true 时显示加载中', async () => {
    ;(globalThis as any).useWrongBook = (_props: any, _emit: any) => ({
      items: ref([]), total: ref(0), page: ref(1), pageSize: ref(10),
      loading: ref(true), keyword: ref(''), filterType: ref(''),
      pageSizeOptions: ref([]), typeOptions: ref([]), totalPages: ref(1),
      prevPage: vi.fn(), nextPage: vi.fn(), refetch: vi.fn(async () => {}),
    })
    const { default: WrongBookModal } = await import('../../../../components/course/wrongBook/modal.vue')
    const wrapper = mount(WrongBookModal, {
      props: { modelValue: true, courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('common.loading')
  })

  it('无错题时显示空提示', async () => {
    const { default: WrongBookModal } = await import('../../../../components/course/wrongBook/modal.vue')
    const wrapper = mount(WrongBookModal, {
      props: { modelValue: true, courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('chapter.wrongBookEmpty')
  })

  it('有错题时渲染列表', async () => {
    ;(globalThis as any).useWrongBook = (_props: any, _emit: any) => ({
      items: ref([
        { cid: 1, courseId: 1, name: '题1', wrongCount: 1 },
        { cid: 2, courseId: 1, name: '题2', wrongCount: 2 },
      ]),
      total: ref(2), page: ref(1), pageSize: ref(10),
      loading: ref(false), keyword: ref(''), filterType: ref(''),
      pageSizeOptions: ref([]), typeOptions: ref([]), totalPages: ref(1),
      prevPage: vi.fn(), nextPage: vi.fn(), refetch: vi.fn(async () => {}),
    })
    const { default: WrongBookModal } = await import('../../../../components/course/wrongBook/modal.vue')
    const wrapper = mount(WrongBookModal, {
      props: { modelValue: true, courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.findAll('.wrong-book-item').length).toBe(2)
  })

  it('正确接收 courseId prop', async () => {
    const { default: WrongBookModal } = await import('../../../../components/course/wrongBook/modal.vue')
    const wrapper = mount(WrongBookModal, {
      props: { modelValue: true, courseId: 42 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('courseId')).toBe(42)
  })
})
