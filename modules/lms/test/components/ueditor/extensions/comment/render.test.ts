/**
 * comment render 组件测试
 * @see modules/lms/components/ueditor/extensions/nodes/vue/comment/render.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n, setMockLmsContext, setMockAuthUser, setMockFetchHandler, clearMockFetchHandler } from '../../../../../../../test/setup/nuxt-stubs'

// Stub composables not in nuxt-stubs
;(globalThis as any).useChapterTask = () => null
;(globalThis as any).useUserCard = () => ({ refreshTrigger: ref(0), refresh: () => {} })

beforeEach(() => {
  resetAllStubs()
  clearMockFetchHandler()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  setMockLmsContext(1, 1)
  // comment render 内含 comment-card，需 stub useSiteConfig
  ;(globalThis as any).useSiteConfig = () => ({ config: ref({}), siteTimeZone: ref('Asia/Shanghai') })
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

  // ── 绿色外框（与作业一致：提交即绿 / 有发表记录也绿） ──

  const topicComment = { name: 'Topic', content: 'topic', tags: [], point: 10, status: 'published' }

  /** 挂载评论块，/api/comments/list 返回指定子评论列表（uid=10 为当前用户） */
  async function mountWith(opts: { children?: any[], onAdd?: () => any } = {}) {
    setMockFetchHandler(async (url: string) => {
      if (String(url).startsWith('/api/comments/list')) {
        return {
          success: true,
          msg: '',
          data: { root: { cid: 1, userId: 99, ...topicComment }, children: opts.children || [] },
        }
      }
      if (String(url).startsWith('/api/comments/add')) {
        return { success: true, msg: '', data: opts.onAdd?.() ?? { cid: 2, userId: 10, content: 'hi', status: 'audit' } }
      }
      return { success: true, msg: '', data: null }
    })
    const { default: CommentRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/comment/render.vue'
    )
    const wrapper = mount(CommentRender, {
      props: { node: { attrs: { content: '1' } }, comment: topicComment, courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    return wrapper
  }

  it('未发表过评论时外框为琥珀色', async () => {
    setMockAuthUser({ id: 10, name: 'Alice' })
    const wrapper = await mountWith({ children: [{ cid: 3, userId: 20, userName: 'Bob', status: 'published' }] })
    const cls = wrapper.find('.comment-render').classes()
    expect(cls).toContain('border-amber-400')
    expect(cls).not.toContain('border-green-400')
  })

  it('已有自己的发表记录时外框为绿色（重新进入也是绿）', async () => {
    setMockAuthUser({ id: 10, name: 'Alice' })
    const wrapper = await mountWith({
      // 自己的回复即使是待审核（作者可见）也算已发表
      children: [{ cid: 2, userId: 10, userName: 'Alice', content: 'mine', status: 'audit' }],
    })
    const cls = wrapper.find('.comment-render').classes()
    expect(cls).toContain('border-green-400')
    expect(cls).toContain('border-2')
    expect(cls).not.toContain('border-amber-400')
  })

  it('提交回复后立即变绿', async () => {
    setMockAuthUser({ id: 10, name: 'Alice' })
    const wrapper = await mountWith({ children: [] })
    expect(wrapper.find('.comment-render').classes()).toContain('border-amber-400')

    await wrapper.find('textarea').setValue('我的回复')
    const submitBtn = wrapper.findAll('button').find(b => b.text().includes('comment.reply'))!
    await submitBtn.trigger('click')
    await flushPromises()

    expect(wrapper.find('.comment-render').classes()).toContain('border-green-400')
  })
})
