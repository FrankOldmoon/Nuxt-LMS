/**
 * comment render 组件测试
 * @see modules/lms/components/ueditor/extensions/nodes/vue/comment/render.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n, setMockLmsContext, setMockAuthUser } from '../../../../../../../test/setup/nuxt-stubs'

// Stub composables not in nuxt-stubs
;(globalThis as any).useChapterTask = () => null
;(globalThis as any).useUserCard = () => ({ refreshTrigger: ref(0), refresh: () => {} })

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
  UPopover: { template: '<div><slot /><slot name="content" /></div>', props: ['modal'] },
  UTextarea: { template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue'] },
  UBadge: { template: '<span><slot /></span>', props: ['color', 'variant', 'size'] },
  ClientOnly: { template: '<div><slot /></div>' },
  AuthUserCard: { template: '<div class="auth-user-card">{{ user?.name }}</div>', props: ['user'] },
  LmsRecordsModalComment: { template: '<div class="records-modal-stub" v-if="modelValue" />', props: ['modelValue', 'courseId', 'cid'] },
  richEditor: { template: '<div class="rich-editor" />', props: ['modelValue', 'placeholder', 'pasteable'] },
  Monaco: { template: '<div />', props: ['modelValue', 'language', 'autoFormat'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('comment/render.vue', () => {
  it('shows notFound when comment is null', async () => {
    const { default: CommentRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/comment/render.vue'
    )
    const wrapper = mount(CommentRender, {
      props: { node: { attrs: { content: '999' } }, comment: null, courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('comment.notFound')
  })

  it('renders comment name and tags when comment provided', async () => {
    const { default: CommentRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/comment/render.vue'
    )
    const wrapper = mount(CommentRender, {
      props: {
        node: { attrs: { content: '1' } },
        comment: { name: 'My Comment', content: '', tags: ['tag1', 'tag2'], point: 5 },
        courseId: 1,
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('My Comment')
    expect(wrapper.text()).toContain('tag1')
    expect(wrapper.text()).toContain('tag2')
  })

  it('shows comment label and point', async () => {
    const { default: CommentRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/comment/render.vue'
    )
    const wrapper = mount(CommentRender, {
      props: {
        node: { attrs: { content: '1' } },
        comment: { name: 'Test', content: '', tags: [], point: 10 },
        courseId: 1,
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('comment.label')
    expect(wrapper.text()).toContain('10')
  })

  it('待审核的主题评论显示「审核中」标识（非教师也看得到）', async () => {
    const { default: CommentRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/comment/render.vue'
    )
    const wrapper = mount(CommentRender, {
      props: {
        node: { attrs: { content: '1' } },
        comment: { name: 'Test', content: '', tags: [], point: 5, status: 'audit' },
        courseId: 1,
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('comment.auditPending')
    expect(wrapper.text()).not.toContain('comment.approve')
  })

  it('已过审的主题评论不显示「审核中」标识', async () => {
    const { default: CommentRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/comment/render.vue'
    )
    const wrapper = mount(CommentRender, {
      props: {
        node: { attrs: { content: '1' } },
        comment: { name: 'Test', content: '', tags: [], point: 5, status: 'published' },
        courseId: 1,
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).not.toContain('comment.auditPending')
  })
})
