/**
 * comment-card component test
 * @see modules/lms/components/ueditor/extensions/nodes/vue/comment/render/comment-card.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n, setMockAuthUser } from '../../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  ueditorRender: { template: '<div class="ueditor-render-stub" />', props: ['json'] },
  AuthUserCard: { template: '<div class="auth-user-card-stub">{{ user?.name }}</div>', props: ['user'] },
  UPopover: {
    template: '<div class="upopover-stub"><slot /><slot name="content" /></div>',
    props: ['modal'],
  },
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  UButton: { template: '<button @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  // formatTime is used directly in the template (not imported in script setup);
  // provide it via mocks so _ctx.formatTime resolves
  mocks: { $t: (k: string) => k, formatTime: (v: any) => String(v) },
}

describe('comment/render/comment-card.vue', () => {
  const sampleComment = {
    cid: 1,
    name: 'Alice',
    content: { type: 'doc' },
    userId: 10,
    createdAt: '2024-01-01T00:00:00Z',
    liked: false,
    likeCount: 3,
  }

  it('renders comment content', async () => {
    const { default: CommentCard } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/comment/render/comment-card.vue'
    )
    const wrapper = mount(CommentCard, {
      props: { comment: sampleComment, isRoot: false, currentUserId: 10 },
      global: _globalConfig,
    })
    expect(wrapper.find('.auth-user-card-stub').exists()).toBe(true)
    expect(wrapper.text()).toContain('Alice')
  })

  it('emits toggle-like when like button clicked', async () => {
    const { default: CommentCard } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/comment/render/comment-card.vue'
    )
    const wrapper = mount(CommentCard, {
      props: { comment: sampleComment, isRoot: false, currentUserId: 10 },
      global: _globalConfig,
    })
    const likeButton = wrapper.find('button')
    await likeButton.trigger('click')
    expect(wrapper.emitted('toggle-like')).toBeTruthy()
    expect(wrapper.emitted('toggle-like')![0][0]).toEqual(sampleComment)
  })

  it('shows delete button when user is the author', async () => {
    const { default: CommentCard } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/comment/render/comment-card.vue'
    )
    const wrapper = mount(CommentCard, {
      props: { comment: sampleComment, isRoot: false, currentUserId: 10 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('common.delete')
  })

  it('shows delete button when user is teacher', async () => {
    setMockAuthUser({ id: 99, name: 'Teacher' }, [{ code: 'teacher' }])
    const { default: CommentCard } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/comment/render/comment-card.vue'
    )
    const wrapper = mount(CommentCard, {
      props: { comment: sampleComment, isRoot: false, currentUserId: 99 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('common.delete')
  })

  it('does not show delete button for non-author non-teacher', async () => {
    setMockAuthUser({ id: 50, name: 'Other' })
    const { default: CommentCard } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/comment/render/comment-card.vue'
    )
    const wrapper = mount(CommentCard, {
      props: { comment: sampleComment, isRoot: false, currentUserId: 99 },
      global: _globalConfig,
    })
    expect(wrapper.text()).not.toContain('common.delete')
  })
})
