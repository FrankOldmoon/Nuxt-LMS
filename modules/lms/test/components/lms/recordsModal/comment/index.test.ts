/**
 * lms/recordsModal/comment/index.vue 组件测试
 * @see modules/lms/components/lms/recordsModal/comment/index.vue
 *
 * 评论记录弹窗：UModal + ClassUsersTable，useCommentRecords 提供数据
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

// mock useCommentRecords（本地导入）
vi.mock('../../../../../components/lms/recordsModal/comment/useCommentRecords', () => ({
  useCommentRecords: (props: any, emit: any) => {
    const { ref, computed }: any = globalThis as any
    return {
      open: computed({
        get: () => props.modelValue,
        set: (v: boolean) => emit('update:modelValue', v),
      }),
      rows: ref([]),
      pending: ref(false),
      extraColumns: computed(() => [{ id: 'record', header: 'Record' }]),
      defaultSort: [{ id: 'record', desc: true }],
    }
  },
}))

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UModal: {
    template: '<div v-if="open" class="modal"><slot name="body" /></div>',
    props: ['open', 'scrollable', 'fullscreen'],
  },
  ClassUsersTable: {
    template: '<div class="class-users-table" />',
    props: ['rows', 'loading', 'extraColumns', 'hideActions', 'hideTeachers', 'defaultSort'],
  },
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('lms/recordsModal/comment/index.vue', () => {
  it('modelValue=true 时渲染弹窗', async () => {
    const { default: CommentRecords } = await import('../../../../../components/lms/recordsModal/comment/index.vue')
    const wrapper = mount(CommentRecords, {
      props: { modelValue: true, courseId: 1, cid: 100 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(true)
  })

  it('modelValue=false 时不渲染弹窗', async () => {
    const { default: CommentRecords } = await import('../../../../../components/lms/recordsModal/comment/index.vue')
    const wrapper = mount(CommentRecords, {
      props: { modelValue: false, courseId: 1, cid: 100 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('渲染评论记录标题', async () => {
    const { default: CommentRecords } = await import('../../../../../components/lms/recordsModal/comment/index.vue')
    const wrapper = mount(CommentRecords, {
      props: { modelValue: true, courseId: 1, cid: 100 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('record.commentRecords')
  })

  it('渲染 ClassUsersTable', async () => {
    const { default: CommentRecords } = await import('../../../../../components/lms/recordsModal/comment/index.vue')
    const wrapper = mount(CommentRecords, {
      props: { modelValue: true, courseId: 1, cid: 100 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.class-users-table').exists()).toBe(true)
  })

  it('正确接收 props', async () => {
    const { default: CommentRecords } = await import('../../../../../components/lms/recordsModal/comment/index.vue')
    const wrapper = mount(CommentRecords, {
      props: { modelValue: true, courseId: 42, cid: 999 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('courseId')).toBe(42)
    expect(wrapper.props('cid')).toBe(999)
  })
})
