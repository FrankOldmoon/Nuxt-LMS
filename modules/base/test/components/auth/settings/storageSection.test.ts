/**
 * auth/settings/storageSection.vue 组件测试
 * @see modules/base/components/auth/settings/storageSection.vue
 */
import {
  describe, it, expect, beforeEach,
  mount,
  _globalConfig, baseBeforeEach,
} from '../_shared'

beforeEach(() => {
  baseBeforeEach()
})

function makeForm(overrides: any = {}) {
  return {
    siteDriveQuota: 1073741824,
    siteTeacherDriveMultiplier: 1,
    ...overrides,
  }
}

describe('auth/settings/storageSection.vue', () => {
  it('渲染 storage section 标题', async () => {
    const { default: StorageSection } = await import('../../../../components/auth/settings/storageSection.vue')
    const wrapper = mount(StorageSection, {
      props: { form: makeForm() },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('settings.storageSection')
  })

  it('渲染配额和倍数字段', async () => {
    const { default: StorageSection } = await import('../../../../components/auth/settings/storageSection.vue')
    const wrapper = mount(StorageSection, {
      props: { form: makeForm() },
      global: _globalConfig,
    })
    const labels = wrapper.findAll('label')
    const labelTexts = labels.map(l => l.text())
    expect(labelTexts.some(t => t.includes('settings.driveQuota'))).toBe(true)
    expect(labelTexts.some(t => t.includes('settings.teacherDriveMultiplier'))).toBe(true)
  })

  it('渲染两个数字输入框', async () => {
    const { default: StorageSection } = await import('../../../../components/auth/settings/storageSection.vue')
    const wrapper = mount(StorageSection, {
      props: { form: makeForm() },
      global: _globalConfig,
    })
    const numberInputs = wrapper.findAll('input[type="number"]')
    expect(numberInputs).toHaveLength(2)
  })
})
