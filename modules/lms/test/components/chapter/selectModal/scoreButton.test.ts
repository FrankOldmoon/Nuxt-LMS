/**
 * chapter/selectModal/scoreButton.vue 组件测试
 * @see modules/lms/components/chapter/selectModal/scoreButton.vue
 *
 * 加减分按钮（Popover 确认）：delta>0 加分（绿），delta<0 减分（红）。
 * 通过 confirm/cancel 事件上报。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({
    locale: { value: 'en' },
    t: (k: string, params?: any) => {
      if (params) {
        let s = k
        for (const [kk, v] of Object.entries(params)) s = s.replace(`{${kk}}`, String(v))
        return s
      }
      return k
    },
    d: (v: any) => String(v),
  })
})

const _globalStubs = {
  UPopover: { template: '<div class="upopover"><slot /><slot name="content" /></div>', props: ['modal'] },
  UButton: {
    template: '<button :disabled="loading" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>',
    props: ['icon', 'color', 'variant', 'size', 'label', 'loading'],
  },
}

const _globalConfig = {
  mocks: {
    $t: (k: string, params?: any) => {
      if (params) {
        let s = k
        for (const [kk, v] of Object.entries(params)) s = s.replace(`{${kk}}`, String(v))
        return s
      }
      return k
    },
  },
  stubs: _globalStubs,
}

describe('chapter/selectModal/scoreButton.vue', () => {
  it('delta>0 渲染加分按钮（label 显示数字）', async () => {
    const { default: ScoreButton } = await import('../../../../components/chapter/selectModal/scoreButton.vue')
    const wrapper = mount(ScoreButton, {
      props: { delta: 3, selectedCount: 2, saving: false },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain('3')
  })

  it('delta<0 渲染减分按钮（label 显示绝对值）', async () => {
    const { default: ScoreButton } = await import('../../../../components/chapter/selectModal/scoreButton.vue')
    const wrapper = mount(ScoreButton, {
      props: { delta: -5, selectedCount: 2, saving: false },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('5')
  })

  it('确认区显示 delta 与 selectedCount', async () => {
    const { default: ScoreButton } = await import('../../../../components/chapter/selectModal/scoreButton.vue')
    const wrapper = mount(ScoreButton, {
      props: { delta: 2, selectedCount: 3, saving: false },
      global: _globalConfig,
    })
    // chapter.scoreConfirm 文案 + 加分按钮 label 显示 Math.abs(delta)=2
    expect(wrapper.text()).toContain('chapter.scoreConfirm')
    expect(wrapper.text()).toContain('2')
  })

  it('点击保存按钮 emit confirm [delta]', async () => {
    const { default: ScoreButton } = await import('../../../../components/chapter/selectModal/scoreButton.vue')
    const wrapper = mount(ScoreButton, {
      props: { delta: 4, selectedCount: 1, saving: false },
      global: _globalConfig,
    })
    // content 区有两个 button：取消 + 保存。保存是最后一个。
    const btns = wrapper.findAll('button')
    await btns[btns.length - 1].trigger('click')
    expect(wrapper.emitted('confirm')).toBeTruthy()
    expect(wrapper.emitted('confirm')![0]).toEqual([4])
  })

  it('点击取消按钮 emit cancel', async () => {
    const { default: ScoreButton } = await import('../../../../components/chapter/selectModal/scoreButton.vue')
    const wrapper = mount(ScoreButton, {
      props: { delta: 1, selectedCount: 1, saving: false },
      global: _globalConfig,
    })
    // content 区第一个 button 是取消
    const btns = wrapper.findAll('button')
    await btns[1].trigger('click')
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('saving=true 时保存按钮 disabled', async () => {
    const { default: ScoreButton } = await import('../../../../components/chapter/selectModal/scoreButton.vue')
    const wrapper = mount(ScoreButton, {
      props: { delta: 1, selectedCount: 1, saving: true },
      global: _globalConfig,
    })
    const btns = wrapper.findAll('button')
    expect((btns[btns.length - 1].element as HTMLButtonElement).disabled).toBe(true)
  })
})
