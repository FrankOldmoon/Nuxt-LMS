/**
 * ueditor/render/nodes/task-item.vue 组件测试
 * @see modules/lms/components/ueditor/render/nodes/task-item.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalConfig = {
  mocks: { $t: (k: string) => k, $i18n: { t: (k: string) => k, locale: { value: 'en' } } },
  stubs: {},
}

describe('ueditor/render/nodes/task-item.vue', () => {
  it('renders an <li> with checkbox and content', async () => {
    const { default: TaskItem } = await import('../../../../../components/ueditor/render/nodes/task-item.vue')
    const wrapper = mount(TaskItem, {
      props: { node: { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'text', text: 'Done task' }] } },
      global: _globalConfig,
    })
    expect(wrapper.find('li').exists()).toBe(true)
    const checkbox = wrapper.find('input[type="checkbox"]')
    expect(checkbox.exists()).toBe(true)
    expect(checkbox.attributes('checked')).toBeDefined()
    expect(wrapper.html()).toContain('Done task')
  })

  it('sets data-checked="false" when unchecked', async () => {
    const { default: TaskItem } = await import('../../../../../components/ueditor/render/nodes/task-item.vue')
    const wrapper = mount(TaskItem, {
      props: { node: { type: 'taskItem', attrs: { checked: false }, content: [] } },
      global: _globalConfig,
    })
    expect(wrapper.find('li').attributes('data-checked')).toBe('false')
  })

  it('checkbox is disabled', async () => {
    const { default: TaskItem } = await import('../../../../../components/ueditor/render/nodes/task-item.vue')
    const wrapper = mount(TaskItem, {
      props: { node: { type: 'taskItem', attrs: { checked: false }, content: [] } },
      global: _globalConfig,
    })
    expect(wrapper.find('input').attributes('disabled')).toBeDefined()
  })
})
