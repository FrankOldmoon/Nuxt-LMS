/**
 * ueditor/render/nodes/task-list.vue 组件测试
 * @see modules/lms/components/ueditor/render/nodes/task-list.vue
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

describe('ueditor/render/nodes/task-list.vue', () => {
  it('renders a <ul> with taskList data-type', async () => {
    const { default: TaskList } = await import('../../../../../components/ueditor/render/nodes/task-list.vue')
    const wrapper = mount(TaskList, {
      props: { node: { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: false }, content: [{ type: 'text', text: 'Task' }] }] } },
      global: _globalConfig,
    })
    expect(wrapper.find('ul').exists()).toBe(true)
    expect(wrapper.find('ul').attributes('data-type')).toBe('taskList')
    expect(wrapper.html()).toContain('Task')
  })
})
