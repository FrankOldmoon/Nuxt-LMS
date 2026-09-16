/**
 * condition/render/locked 组件测试
 * @see modules/lms/components/ueditor/extensions/nodes/vue/condition/render/locked.vue
 *
 * Simple props-based component (config + formatCondition function), uses useI18n
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  ueditorRender: { template: '<div class="ueditor-render-stub" />', props: ['json'] },
  UIcon: { template: '<span />', props: ['name'] },
  UBadge: { template: '<span class="badge"><slot /></span>', props: ['variant', 'size'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('condition/render/locked.vue', () => {
  const formatCondition = (c: any) => `${c.type}: ${c.value}`

  it('renders locked placeholder with denied message and no content', async () => {
    const { default: ConditionLocked } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/condition/render/locked.vue'
    )
    const wrapper = mount(ConditionLocked, {
      props: {
        config: { content: { type: 'doc', content: [] }, conditions: [] },
        formatCondition,
      },
      global: _globalConfig,
    })
    expect(wrapper.find('.condition-locked').exists()).toBe(true)
    expect(wrapper.find('.condition-locked-body').exists()).toBe(true)
    expect(wrapper.text()).toContain('ueditor.conditionDenied')
    // 条件未满足时正文内容完全不渲染（不露模糊预览）
    expect(wrapper.find('.ueditor-render-stub').exists()).toBe(false)
  })

  it('renders condition tags when conditions exist', async () => {
    const { default: ConditionLocked } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/condition/render/locked.vue'
    )
    const wrapper = mount(ConditionLocked, {
      props: {
        config: {
          content: { type: 'doc', content: [] },
          conditions: [
            { type: 'role', value: 'admin', label: 'Admin' },
            { type: 'class', value: '1', label: 'Class 1' },
          ],
        },
        formatCondition,
      },
      global: _globalConfig,
    })
    const badges = wrapper.findAll('.badge')
    expect(badges.length).toBe(2)
    expect(badges[0].text()).toContain('role: admin')
    expect(badges[1].text()).toContain('class: 1')
  })

  it('does not render condition tags when no conditions', async () => {
    const { default: ConditionLocked } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/condition/render/locked.vue'
    )
    const wrapper = mount(ConditionLocked, {
      props: {
        config: { content: { type: 'doc', content: [] }, conditions: [] },
        formatCondition,
      },
      global: _globalConfig,
    })
    expect(wrapper.find('.condition-tags').exists()).toBe(false)
  })
})
