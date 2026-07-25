/**
 * course/task/dot.vue 组件测试
 * @see modules/lms/components/course/task/dot.vue
 *
 * 任务状态点：根据 type 和 status 显示不同图标和颜色
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UTooltip: {
    template: '<div class="utooltip"><slot /></div>',
    props: ['text'],
  },
  UIcon: {
    template: '<span class="uicon" :data-name="name" />',
    props: ['name'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('course/task/dot.vue', () => {
  it('type=question 渲染 question 图标', async () => {
    const { default: TaskDot } = await import('../../../../components/course/task/dot.vue')
    const wrapper = mount(TaskDot, {
      props: { type: 'question', status: 'done', id: 1 },
      global: _globalConfig,
    })
    expect(wrapper.find('[data-name="i-lucide-help-circle"]').exists()).toBe(true)
  })

  it('type=homework 渲染 homework 图标', async () => {
    const { default: TaskDot } = await import('../../../../components/course/task/dot.vue')
    const wrapper = mount(TaskDot, {
      props: { type: 'homework', status: 'done', id: 1 },
      global: _globalConfig,
    })
    expect(wrapper.find('[data-name="i-lucide-file-text"]').exists()).toBe(true)
  })

  it('type=comment 渲染 comment 图标', async () => {
    const { default: TaskDot } = await import('../../../../components/course/task/dot.vue')
    const wrapper = mount(TaskDot, {
      props: { type: 'comment', status: 'done', id: 1 },
      global: _globalConfig,
    })
    expect(wrapper.find('[data-name="i-lucide-message-circle"]').exists()).toBe(true)
  })

  it('点击 dot 时 emit click 事件', async () => {
    const { default: TaskDot } = await import('../../../../components/course/task/dot.vue')
    const wrapper = mount(TaskDot, {
      props: { type: 'question', status: 'todo', id: 5 },
      global: _globalConfig,
    })
    const dot = wrapper.find('.cursor-pointer')
    expect(dot.exists()).toBe(true)
    await dot.trigger('click')
    const clickEvents = wrapper.emitted('click')
    expect(clickEvents).toBeTruthy()
    expect(clickEvents!.length).toBe(1)
    // emit 时传入 props 对象
    const emittedArg = clickEvents![0]![0] as any
    expect(emittedArg.id).toBe(5)
    expect(emittedArg.type).toBe('question')
  })

  it('status=done 应用绿色 class', async () => {
    const { default: TaskDot } = await import('../../../../components/course/task/dot.vue')
    const wrapper = mount(TaskDot, {
      props: { type: 'question', status: 'done', id: 1 },
      global: _globalConfig,
    })
    const dot = wrapper.find('.cursor-pointer')
    expect(dot.classes()).toContain('bg-green-500')
  })

  it('status=partial 应用黄色 class', async () => {
    const { default: TaskDot } = await import('../../../../components/course/task/dot.vue')
    const wrapper = mount(TaskDot, {
      props: { type: 'question', status: 'partial', id: 1 },
      global: _globalConfig,
    })
    const dot = wrapper.find('.cursor-pointer')
    expect(dot.classes()).toContain('bg-yellow-400')
  })

  it('status=todo 应用灰色 class', async () => {
    const { default: TaskDot } = await import('../../../../components/course/task/dot.vue')
    const wrapper = mount(TaskDot, {
      props: { type: 'question', status: 'todo', id: 1 },
      global: _globalConfig,
    })
    const dot = wrapper.find('.cursor-pointer')
    expect(dot.classes()).toContain('bg-gray-200')
  })

  it('默认 type 为空字符串时不渲染 icon', async () => {
    const { default: TaskDot } = await import('../../../../components/course/task/dot.vue')
    const wrapper = mount(TaskDot, {
      props: { status: 'todo', id: 1 },
      global: _globalConfig,
    })
    // type 默认 ''，icon 为 ''，UIcon 不渲染（v-if="icon"）
    expect(wrapper.find('.uicon').exists()).toBe(false)
  })
})
