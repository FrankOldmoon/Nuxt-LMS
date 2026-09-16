/**
 * ueditor/render/nodes/select.vue 组件测试
 * @see modules/lms/components/ueditor/render/nodes/select.vue
 *
 * 选项通过 inject('questionData') 提供；UI 已从原生 <select> 改为
 * UDropdownMenu + UButton（点击菜单项即选中并 emit('update', value)）。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n, provide } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  ClientOnly: { template: '<div><slot /></div>' },
  // UDropdownMenu 桩：把 items 渲染成可点击按钮（items[].onSelect 即选中回调）
  UDropdownMenu: {
    template: '<div class="uddm"><slot />'
      + '<div class="uddm-items">'
      + '<button v-for="(i, idx) in items" :key="idx" class="uddm-item" @click="i.onSelect && i.onSelect()">{{ i.label }}</button>'
      + '</div></div>',
    props: ['items', 'open', 'content'],
    emits: ['update:open'],
  },
  UButton: {
    template: '<button class="ubtn">{{ label }}<slot /></button>',
    props: ['label', 'variant', 'color', 'size', 'trailingIcon', 'disabled'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k, $i18n: { t: (k: string) => k, locale: { value: 'en' } } },
  stubs: _globalStubs,
}

async function mountSelect() {
  const { default: SelectView } = await import('../../../../../components/ueditor/render/nodes/select.vue')
  return mount(SelectView, { props: { node: { type: 'select' } }, global: _globalConfig })
}

describe('ueditor/render/nodes/select.vue', () => {
  it('渲染注入的选项，初始显示占位文案', async () => {
    provide('questionData', ref({ options: ['Option A', 'Option B'] }))
    const wrapper = await mountSelect()

    expect(wrapper.find('.ubtn').text()).toContain('common.selectPlaceholder')
    const items = wrapper.findAll('.uddm-item')
    expect(items.length).toBe(2)
    expect(items[0].text()).toBe('Option A')
    expect(items[1].text()).toBe('Option B')
  })

  it('点击菜单项后显示所选值并 emit update', async () => {
    provide('questionData', ref({ options: ['Option A', 'Option B'] }))
    const wrapper = await mountSelect()

    await wrapper.findAll('.uddm-item')[1].trigger('click')

    expect(wrapper.find('.ubtn').text()).toContain('Option B')
    expect(wrapper.emitted('update')?.[0]).toEqual(['Option B'])
  })

  it('没有注入 questionData 时没有选项，仍显示占位文案', async () => {
    const wrapper = await mountSelect()
    expect(wrapper.findAll('.uddm-item').length).toBe(0)
    expect(wrapper.find('.ubtn').text()).toContain('common.selectPlaceholder')
  })
})
