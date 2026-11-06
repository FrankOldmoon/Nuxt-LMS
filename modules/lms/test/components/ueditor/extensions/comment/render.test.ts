/**
 * comment render 组件测试
 * @see modules/lms/components/ueditor/extensions/nodes/vue/comment/render.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n, setMockLmsContext, setMockAuthUser, setMockFetchHandler, clearMockFetchHandler, dispatchWsHandler } from '../../../../../../../test/setup/nuxt-stubs'

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

  it('新建评论（cid 为 0）不发起请求、不显示「未找到」，显示「尚未保存」', async () => {
    const calls: string[] = []
    setMockFetchHandler(async (url: string) => {
      calls.push(String(url))
      return { success: true, msg: '', data: null }
    })
    const { default: CommentRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/comment/render.vue'
    )
    const wrapper = mount(CommentRender, {
      props: { node: { attrs: { content: '' } }, comment: null, courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(calls).toEqual([])
    expect(wrapper.text()).not.toContain('comment.notFound')
    expect(wrapper.text()).toContain('comment.unsaved')
  })

  it('接口返回非对象（如 HTML 字符串）时不当作评论数据', async () => {
    setMockFetchHandler(async () => '<!DOCTYPE html><html></html>' as any)
    const { default: CommentRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/comment/render.vue'
    )
    const wrapper = mount(CommentRender, {
      props: { node: { attrs: { content: '5' } }, comment: null, courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('comment.notFound')
    expect(wrapper.text()).not.toContain('DOCTYPE')
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

  // ── 章节完成判定：回复默认待审核，需老师 approve（status='published'）后才计入进度 ──

  /** 用 spy 替换 useChapterTask，收集 reportNodeDone 调用 */
  function spyReportNodeDone() {
    const calls: any[][] = []
    ;(globalThis as any).useChapterTask = () => ({
      reportNodeDone: (...args: any[]) => calls.push(args),
    })
    return calls
  }

  it('回复仅待审核（audit）时不上报完成', async () => {
    setMockAuthUser({ id: 10, name: 'Alice' })
    const calls = spyReportNodeDone()
    const wrapper = await mountWith({ children: [] })
    expect(calls).toEqual([])

    await wrapper.find('textarea').setValue('我的回复')
    await wrapper.findAll('button').find(b => b.text().includes('comment.reply'))!.trigger('click')
    await flushPromises()

    // 新回复 status='audit'：不能算完成
    expect(calls).toEqual([])
  })

  it('自己的回复仍待审核时（重新进入）不上报完成', async () => {
    setMockAuthUser({ id: 10, name: 'Alice' })
    const calls = spyReportNodeDone()
    await mountWith({ children: [{ cid: 2, userId: 10, userName: 'Alice', content: 'mine', status: 'audit' }] })
    expect(calls).toEqual([])
  })

  it('已有过审回复时上报完成', async () => {
    setMockAuthUser({ id: 10, name: 'Alice' })
    const calls = spyReportNodeDone()
    await mountWith({ children: [{ cid: 2, userId: 10, userName: 'Alice', content: 'mine', status: 'published' }] })
    expect(calls).toEqual([['comment', 1, true]])
  })

  it('别人的过审回复不触发我的完成', async () => {
    setMockAuthUser({ id: 10, name: 'Alice' })
    const calls = spyReportNodeDone()
    await mountWith({ children: [{ cid: 3, userId: 20, userName: 'Bob', content: 'his', status: 'published' }] })
    expect(calls).toEqual([])
  })

  // ── 审核通过：就地更新单条状态，不重拉列表（否则列表/表单重建导致界面跳动） ──

  /** 以老师身份挂载，记录所有请求 URL；children 默认一条待审核回复 */
  async function mountAsTeacher(children: any[]) {
    setMockAuthUser({ id: 99, name: 'Teacher' }, [{ code: 'teacher' }])
    const urls: string[] = []
    setMockFetchHandler(async (url: string) => {
      urls.push(String(url))
      if (String(url).startsWith('/api/comments/list')) {
        return {
          success: true,
          msg: '',
          data: { root: { cid: 1, userId: 99, ...topicComment }, children },
        }
      }
      return { success: true, msg: '', data: { approved: true } }
    })
    const { default: CommentRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/comment/render.vue'
    )
    const wrapper = mount(CommentRender, {
      props: { node: { attrs: { content: '1' } }, comment: topicComment, courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    const listCalls = () => urls.filter(u => u.startsWith('/api/comments/list')).length
    return { wrapper, urls, listCalls }
  }

  it('点审核通过后只改本地状态，不重新请求评论列表', async () => {
    const { wrapper, urls, listCalls } = await mountAsTeacher([
      { cid: 2, userId: 10, userName: 'Alice', content: 'mine', status: 'audit' },
    ])
    expect(wrapper.text()).toContain('comment.auditPending')
    const before = listCalls()

    const approveBtn = wrapper.findAll('button').find(b => b.text().includes('comment.approve'))!
    await approveBtn.trigger('click')
    await flushPromises()

    expect(urls.some(u => u.startsWith('/api/comments/approve'))).toBe(true)
    // 关键：列表没被重拉（重拉会让 loading 占位替换掉列表 + 回复表单）
    expect(listCalls()).toBe(before)
    expect(wrapper.text()).not.toContain('comment.auditPending')
  })

  it('自己审核触发的 WS 广播不再刷新（本地已就地更新）', async () => {
    const { wrapper, listCalls } = await mountAsTeacher([
      { cid: 2, userId: 10, userName: 'Alice', content: 'mine', status: 'audit' },
    ])
    const before = listCalls()

    await wrapper.findAll('button').find(b => b.text().includes('comment.approve'))!.trigger('click')
    await flushPromises()

    // 服务端 fire-and-forget 广播回本端
    dispatchWsHandler('commentRefresh', { courseId: 1, topicCid: 1, cid: 2 })
    await flushPromises()

    expect(listCalls()).toBe(before)
  })

  it('别人审核的广播只更新目标那一条，不重拉列表', async () => {
    const { wrapper, listCalls } = await mountAsTeacher([
      { cid: 2, userId: 10, userName: 'Alice', content: 'a', status: 'audit' },
      { cid: 3, userId: 20, userName: 'Bob', content: 'b', status: 'audit' },
    ])
    const before = listCalls()
    const auditCount = () => (wrapper.html().match(/comment\.auditPending/g) || []).length
    expect(auditCount()).toBe(2)

    dispatchWsHandler('commentRefresh', { courseId: 1, topicCid: 1, cid: 3 })
    await flushPromises()

    expect(listCalls()).toBe(before)
    expect(auditCount()).toBe(1)
  })
})
