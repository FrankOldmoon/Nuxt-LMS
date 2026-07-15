/**
 * course/wrongBook/item.vue component test
 * @see modules/lms/components/course/wrongBook/item.vue
 *
 * Wrong question item: header (question type/name/wrong count) + question rendering
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string, params?: any) => {
    if (params) {
      let s = k
      for (const [kk, v] of Object.entries(params)) s = s.replace(`{${kk}}`, String(v))
      return s
    }
    return k
  } })
})

const _globalStubs = {
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  UTooltip: { template: '<span class="utooltip"><slot /></span>', props: ['text'] },
  QuestionRender: { template: '<div class="question-render" />', props: ['node', 'courseId'] },
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

describe('course/wrongBook/item.vue', () => {
  const sampleItem = {
    cid: 100,
    courseId: 1,
    name: 'Vue 生命周期',
    wrongCount: 3,
  }

  it('渲染错题名称', async () => {
    const { default: WrongBookItem } = await import('../../../../components/course/wrongBook/item.vue')
    const wrapper = mount(WrongBookItem, {
      props: { item: sampleItem },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('Vue 生命周期')
  })

  it('渲染错题次数', async () => {
    const { default: WrongBookItem } = await import('../../../../components/course/wrongBook/item.vue')
    const wrapper = mount(WrongBookItem, {
      props: { item: sampleItem },
      global: _globalConfig,
    })
    // $t('chapter.wrongTimes', { n: item.wrongCount }) — mock returns key as-is (no {n} placeholder)
    expect(wrapper.text()).toContain('chapter.wrongTimes')
  })

  it('渲染题目 ID', async () => {
    const { default: WrongBookItem } = await import('../../../../components/course/wrongBook/item.vue')
    const wrapper = mount(WrongBookItem, {
      props: { item: sampleItem },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('#100')
  })

  it('渲染 QuestionRender 组件', async () => {
    const { default: WrongBookItem } = await import('../../../../components/course/wrongBook/item.vue')
    const wrapper = mount(WrongBookItem, {
      props: { item: sampleItem },
      global: _globalConfig,
    })
    expect(wrapper.find('.question-render').exists()).toBe(true)
  })

  it('name 为空时显示未命名', async () => {
    const { default: WrongBookItem } = await import('../../../../components/course/wrongBook/item.vue')
    const wrapper = mount(WrongBookItem, {
      props: { item: { ...sampleItem, name: '' } },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('common.unnamed')
  })

  it('正确接收 item prop', async () => {
    const { default: WrongBookItem } = await import('../../../../components/course/wrongBook/item.vue')
    const wrapper = mount(WrongBookItem, {
      props: { item: sampleItem },
      global: _globalConfig,
    })
    expect(wrapper.props('item')).toEqual(sampleItem)
  })
})
