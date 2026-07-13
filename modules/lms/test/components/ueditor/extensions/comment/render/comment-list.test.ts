/**
 * comment-list 组件测试
 * @see modules/lms/components/ueditor/extensions/nodes/vue/comment/render/comment-list.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  CommentCard: {
    template: '<div class="comment-card-stub" @click="$emit(\'toggle-like\', comment)">{{ comment.name }}</div>',
    props: ['comment', 'isRoot', 'currentUserId'],
    emits: ['toggle-like', 'delete'],
  },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('comment/render/comment-list.vue', () => {
  const sampleComments = [
    { cid: 1, name: 'Alice', content: 'hello', userId: 10 },
    { cid: 2, name: 'Bob', content: 'world', userId: 20 },
  ]

  it('renders list of comments', async () => {
    const { default: CommentList } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/comment/render/comment-list.vue'
    )
    const wrapper = mount(CommentList, {
      props: { comments: sampleComments, currentUserId: 10 },
      global: _globalConfig,
    })
    const cards = wrapper.findAll('.comment-card-stub')
    expect(cards).toHaveLength(2)
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('Bob')
  })

  it('shows noReplies message when comments is empty', async () => {
    const { default: CommentList } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/comment/render/comment-list.vue'
    )
    const wrapper = mount(CommentList, {
      props: { comments: [], currentUserId: 10 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('comment.noReplies')
  })

  it('forwards toggle-like event from child', async () => {
    const { default: CommentList } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/comment/render/comment-list.vue'
    )
    const wrapper = mount(CommentList, {
      props: { comments: sampleComments, currentUserId: 10 },
      global: _globalConfig,
    })
    const firstCard = wrapper.find('.comment-card-stub')
    await firstCard.trigger('click')
    expect(wrapper.emitted('toggle-like')).toBeTruthy()
    expect(wrapper.emitted('toggle-like')![0][0]).toEqual(sampleComments[0])
  })
})
