/**
 * course/editor/memberSearchRow.vue component test
 * @see modules/lms/components/course/editor/memberSearchRow.vue
 *
 * Search result row: avatar + name + add as teacher/editor button
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
    template: '<button class="ubutton" :disabled="loading || disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['icon', 'size', 'color', 'variant', 'loading', 'disabled', 'label'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('course/editor/memberSearchRow.vue', () => {
  const sampleUser = {
    id: 7,
    name: '李老师',
    username: 'li_teacher',
    avatarImg: null,
  }

  it('渲染用户姓名和用户名', async () => {
    const { default: MemberSearchRow } = await import('../../../../components/course/editor/memberSearchRow.vue')
    const wrapper = mount(MemberSearchRow, {
      props: { user: sampleUser, updating: false, isTeacher: false, isEditor: false },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('李老师')
    expect(wrapper.text()).toContain('li_teacher')
  })

  it('点击教师按钮 emit add 事件 with role=teacher', async () => {
    const { default: MemberSearchRow } = await import('../../../../components/course/editor/memberSearchRow.vue')
    const wrapper = mount(MemberSearchRow, {
      props: { user: sampleUser, updating: false, isTeacher: false, isEditor: false },
      global: _globalConfig,
    })
    const buttons = wrapper.findAll('.ubutton')
    // The first button is the teacher button
    await buttons[0]!.trigger('click')
    const addEvents = wrapper.emitted('add')
    expect(addEvents).toBeTruthy()
    expect(addEvents![0]).toEqual([7, 'teacher'])
  })

  it('点击编辑按钮 emit add 事件 with role=editor', async () => {
    const { default: MemberSearchRow } = await import('../../../../components/course/editor/memberSearchRow.vue')
    const wrapper = mount(MemberSearchRow, {
      props: { user: sampleUser, updating: false, isTeacher: false, isEditor: false },
      global: _globalConfig,
    })
    const buttons = wrapper.findAll('.ubutton')
    // The second button is the edit button
    await buttons[1]!.trigger('click')
    const addEvents = wrapper.emitted('add')
    expect(addEvents).toBeTruthy()
    expect(addEvents![0]).toEqual([7, 'editor'])
  })

  it('isTeacher=true 时教师按钮禁用', async () => {
    const { default: MemberSearchRow } = await import('../../../../components/course/editor/memberSearchRow.vue')
    const wrapper = mount(MemberSearchRow, {
      props: { user: sampleUser, updating: false, isTeacher: true, isEditor: false },
      global: _globalConfig,
    })
    const buttons = wrapper.findAll('.ubutton')
    expect(buttons[0]!.attributes('disabled')).toBeDefined()
  })

  it('isEditor=true 时编辑按钮禁用', async () => {
    const { default: MemberSearchRow } = await import('../../../../components/course/editor/memberSearchRow.vue')
    const wrapper = mount(MemberSearchRow, {
      props: { user: sampleUser, updating: false, isTeacher: false, isEditor: true },
      global: _globalConfig,
    })
    const buttons = wrapper.findAll('.ubutton')
    expect(buttons[1]!.attributes('disabled')).toBeDefined()
  })

  it('updating=true 时所有按钮禁用', async () => {
    const { default: MemberSearchRow } = await import('../../../../components/course/editor/memberSearchRow.vue')
    const wrapper = mount(MemberSearchRow, {
      props: { user: sampleUser, updating: true, isTeacher: false, isEditor: false },
      global: _globalConfig,
    })
    const buttons = wrapper.findAll('.ubutton')
    expect(buttons[0]!.attributes('disabled')).toBeDefined()
    expect(buttons[1]!.attributes('disabled')).toBeDefined()
  })
})
