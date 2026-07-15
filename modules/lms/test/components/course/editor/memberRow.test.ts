/**
 * course/editor/memberRow.vue component test
 * @see modules/lms/components/course/editor/memberRow.vue
 *
 * Member row: avatar + name + delete button
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UAvatar: {
    template: '<span class="uavatar">{{ alt || text }}</span>',
    props: ['src', 'alt', 'text', 'size'],
  },
  UButton: {
    template: '<button class="ubutton" :disabled="loading" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['icon', 'size', 'color', 'variant', 'loading', 'aria-label'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('course/editor/memberRow.vue', () => {
  const sampleMember = {
    userId: 5,
    name: '张老师',
    username: 'teacher_zhang',
    avatarImg: 'https://example.com/a.png',
  }

  it('渲染成员姓名和用户名', async () => {
    const { default: MemberRow } = await import('../../../../components/course/editor/memberRow.vue')
    const wrapper = mount(MemberRow, {
      props: { member: sampleMember, role: 'teacher', updating: false },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('张老师')
    expect(wrapper.text()).toContain('teacher_zhang')
  })

  it('点击删除按钮 emit remove 事件', async () => {
    const { default: MemberRow } = await import('../../../../components/course/editor/memberRow.vue')
    const wrapper = mount(MemberRow, {
      props: { member: sampleMember, role: 'teacher', updating: false },
      global: _globalConfig,
    })
    await wrapper.find('.ubutton').trigger('click')
    const removeEvents = wrapper.emitted('remove')
    expect(removeEvents).toBeTruthy()
    expect(removeEvents![0]).toEqual([5, 'teacher'])
  })

  it('role=editor 时 emit 中 role 为 editor', async () => {
    const { default: MemberRow } = await import('../../../../components/course/editor/memberRow.vue')
    const wrapper = mount(MemberRow, {
      props: { member: sampleMember, role: 'editor', updating: false },
      global: _globalConfig,
    })
    await wrapper.find('.ubutton').trigger('click')
    const removeEvents = wrapper.emitted('remove')
    expect(removeEvents).toBeTruthy()
    expect(removeEvents![0]).toEqual([5, 'editor'])
  })

  it('updating=true 时按钮显示 loading', async () => {
    const { default: MemberRow } = await import('../../../../components/course/editor/memberRow.vue')
    const wrapper = mount(MemberRow, {
      props: { member: sampleMember, role: 'teacher', updating: true },
      global: _globalConfig,
    })
    const btn = wrapper.find('.ubutton')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('渲染 UAvatar（首字母）', async () => {
    const { default: MemberRow } = await import('../../../../components/course/editor/memberRow.vue')
    const wrapper = mount(MemberRow, {
      props: { member: sampleMember, role: 'teacher', updating: false },
      global: _globalConfig,
    })
    const avatar = wrapper.find('.uavatar')
    expect(avatar.exists()).toBe(true)
    expect(avatar.text()).toContain('张')
  })
})
