/**
 * course/editor/memberRow.vue 组件测试
 * @see modules/lms/components/course/editor/memberRow.vue
 *
 * 成员行：头像 + 姓名 + 删除按钮
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  // 组件内头像走 AvatarWithFrame（UAvatar + 头像框），测试里桩掉并暴露关键 props
  AvatarWithFrame: {
    template: '<span class="avatar-with-frame" :data-src="src" :data-frame="frame">{{ text }}</span>',
    props: ['src', 'alt', 'text', 'size', 'frame', 'userId', 'shape'],
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

  it('渲染头像（AvatarWithFrame，含首字母）', async () => {
    const { default: MemberRow } = await import('../../../../components/course/editor/memberRow.vue')
    const wrapper = mount(MemberRow, {
      props: { member: sampleMember, role: 'teacher', updating: false },
      global: _globalConfig,
    })
    const avatar = wrapper.find('.avatar-with-frame')
    expect(avatar.exists()).toBe(true)
    expect(avatar.text()).toContain('张')
    expect(avatar.attributes('data-src')).toBe('https://example.com/a.png')
  })
})
