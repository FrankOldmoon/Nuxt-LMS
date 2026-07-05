import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import InputTags from '~/components/form/input-tags.vue'

describe('input-tags.vue', () => {
  function makeWrapper(modelValue: string[] = [], placeholder: string = '') {
    return mount(InputTags, {
      props: {
        modelValue,
        placeholder,
      },
    })
  }

  it('renders existing tags', () => {
    const wrapper = makeWrapper(['tag1', 'tag2', 'tag3'])
    const tags = wrapper.findAll('span.inline-flex')
    expect(tags).toHaveLength(3)
    expect(tags[0].text()).toContain('tag1')
    expect(tags[1].text()).toContain('tag2')
    expect(tags[2].text()).toContain('tag3')
  })

  it('renders no tags for empty array', () => {
    const wrapper = makeWrapper([])
    const tags = wrapper.findAll('span.inline-flex')
    expect(tags).toHaveLength(0)
  })

  it('emits update:modelValue with new tag on Enter', async () => {
    const wrapper = makeWrapper([])
    const input = wrapper.find('input')
    await input.setValue('newtag')
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([['newtag']])
  })

  it('does not add empty tag on Enter', async () => {
    const wrapper = makeWrapper([])
    const input = wrapper.find('input')
    await input.setValue('   ')
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
  })

  it('trims whitespace from tags', async () => {
    const wrapper = makeWrapper([])
    const input = wrapper.find('input')
    await input.setValue('  spaced  ')
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([['spaced']])
  })

  it('does not add duplicate tags', async () => {
    const wrapper = makeWrapper(['existing'])
    const input = wrapper.find('input')
    await input.setValue('existing')
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
  })

  it('clears input after adding tag', async () => {
    const wrapper = makeWrapper([])
    const input = wrapper.find('input')
    await input.setValue('newtag')
    await input.trigger('keydown', { key: 'Enter' })
    expect((input.element as HTMLInputElement).value).toBe('')
  })

  it('removes tag on remove button click', async () => {
    const wrapper = makeWrapper(['tag1', 'tag2', 'tag3'])
    const removeButtons = wrapper.findAll('button')
    // Each tag has a remove button
    expect(removeButtons).toHaveLength(3)
    await removeButtons[1].trigger('click')
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([['tag1', 'tag3']])
  })

  it('removes last tag on Backspace when input is empty', async () => {
    const wrapper = makeWrapper(['tag1', 'tag2'])
    const input = wrapper.find('input')
    await input.trigger('keydown', { key: 'Backspace' })
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([['tag1']])
  })

  it('does not remove tag on Backspace when input has text', async () => {
    const wrapper = makeWrapper(['tag1', 'tag2'])
    const input = wrapper.find('input')
    await input.setValue('typing')
    await input.trigger('keydown', { key: 'Backspace' })
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
  })

  it('does not remove tag on Backspace when no tags exist', async () => {
    const wrapper = makeWrapper([])
    const input = wrapper.find('input')
    await input.trigger('keydown', { key: 'Backspace' })
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
  })

  it('appends new tag to existing tags', async () => {
    const wrapper = makeWrapper(['existing'])
    const input = wrapper.find('input')
    await input.setValue('newtag')
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([['existing', 'newtag']])
  })

  it('removes first tag correctly', async () => {
    const wrapper = makeWrapper(['tag1', 'tag2', 'tag3'])
    const removeButtons = wrapper.findAll('button')
    await removeButtons[0].trigger('click')
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([['tag2', 'tag3']])
  })

  it('removes last tag correctly', async () => {
    const wrapper = makeWrapper(['tag1', 'tag2', 'tag3'])
    const removeButtons = wrapper.findAll('button')
    await removeButtons[2].trigger('click')
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([['tag1', 'tag2']])
  })

  it('removes only tag correctly', async () => {
    const wrapper = makeWrapper(['only'])
    const removeButtons = wrapper.findAll('button')
    await removeButtons[0].trigger('click')
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([[]])
  })

  it('shows placeholder text', () => {
    const wrapper = makeWrapper([], 'Add a tag...')
    const input = wrapper.find('input')
    expect(input.attributes('placeholder')).toBe('Add a tag...')
  })
})
