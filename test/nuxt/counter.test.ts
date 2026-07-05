import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Counter from '~/components/ueditor/render/nodes/vue/counter.vue'

describe('counter.vue', () => {
  function makeWrapper(nodeContent: number = 0) {
    return mount(Counter, {
      props: {
        node: { attrs: { content: nodeContent } },
      },
    })
  }

  it('renders initial count from node attrs', () => {
    const wrapper = makeWrapper(5)
    expect(wrapper.text()).toContain('5')
  })

  it('defaults to 0 when node attrs content is missing', () => {
    const wrapper = mount(Counter, {
      props: { node: {} },
    })
    expect(wrapper.text()).toContain('0')
  })

  it('defaults to 0 when node is undefined', () => {
    const wrapper = mount(Counter, {
      props: { node: undefined },
    })
    expect(wrapper.text()).toContain('0')
  })

  it('increments count on plus button click', async () => {
    const wrapper = makeWrapper(3)
    const buttons = wrapper.findAll('button')
    const plusBtn = buttons[1]
    await plusBtn.trigger('click')
    expect(wrapper.text()).toContain('4')
  })

  it('decrements count on minus button click', async () => {
    const wrapper = makeWrapper(5)
    const buttons = wrapper.findAll('button')
    const minusBtn = buttons[0]
    await minusBtn.trigger('click')
    expect(wrapper.text()).toContain('4')
  })

  it('does not decrement below 0', async () => {
    const wrapper = makeWrapper(0)
    const buttons = wrapper.findAll('button')
    const minusBtn = buttons[0]
    await minusBtn.trigger('click')
    expect(wrapper.text()).toContain('0')
  })

  it('can increment above 0', async () => {
    const wrapper = makeWrapper(0)
    const buttons = wrapper.findAll('button')
    await buttons[1].trigger('click')
    expect(wrapper.text()).toContain('1')
    await buttons[1].trigger('click')
    expect(wrapper.text()).toContain('2')
  })

  it('disables minus button when count is 0', () => {
    const wrapper = makeWrapper(0)
    const buttons = wrapper.findAll('button')
    expect(buttons[0].attributes('disabled')).toBeDefined()
  })

  it('does not disable minus button when count > 0', () => {
    const wrapper = makeWrapper(1)
    const buttons = wrapper.findAll('button')
    expect(buttons[0].attributes('disabled')).toBeUndefined()
  })
})
