/**
 * ProfileField component tests
 * @see modules/base/components/auth/profileField.vue
 *
 * Simple display component: label + value
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

describe('auth/profileField.vue', () => {
  it('渲染 label 和 value', async () => {
    const { default: ProfileField } = await import('../../components/auth/profileField.vue')
    const wrapper = mount(ProfileField, { props: { label: '用户名', value: 'alice' } })
    expect(wrapper.text()).toContain('用户名')
    expect(wrapper.text()).toContain('alice')
  })

  it('value 为 null 时显示占位符 -', async () => {
    const { default: ProfileField } = await import('../../components/auth/profileField.vue')
    const wrapper = mount(ProfileField, { props: { label: '邮箱', value: null } })
    expect(wrapper.text()).toContain('-')
  })

  it('value 为 undefined 时显示占位符 -', async () => {
    const { default: ProfileField } = await import('../../components/auth/profileField.vue')
    const wrapper = mount(ProfileField, { props: { label: '电话' } })
    expect(wrapper.text()).toContain('-')
  })

  it('value 为空字符串时显示空内容', async () => {
    const { default: ProfileField } = await import('../../components/auth/profileField.vue')
    const wrapper = mount(ProfileField, { props: { label: '昵称', value: '' } })
    // Component uses value ?? '-', empty string is not null/undefined, will display empty content as-is
    const span = wrapper.findAll('span')[1]
    expect(span.text()).toBe('')
  })

  it('接受长文本并 break-all', async () => {
    const { default: ProfileField } = await import('../../components/auth/profileField.vue')
    const longText = 'a'.repeat(100)
    const wrapper = mount(ProfileField, { props: { label: '描述', value: longText } })
    expect(wrapper.html()).toContain('break-all')
  })
})
