/**
 * lms/configEditor/userSection.vue component test
 * @see modules/lms/components/lms/configEditor/userSection.vue
 *
 * User-side feature availability config: 5 switches (avatar/password/email/language/export)
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  USwitch: {
    template: '<label class="uswitch"><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" /></label>',
    props: ['modelValue'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

function setupContext() {
  const config = reactive({
    user: {
      allowSelfAvatarUpload: true,
      allowChangePassword: true,
      allowChangeEmail: true,
      allowChangeLocale: true,
      allowExportData: true,
    },
  })
  ;(globalThis as any).useConfigEditorContext = () => ({ config })
  return config
}

describe('lms/configEditor/userSection.vue', () => {
  it('渲染用户配置标题', async () => {
    setupContext()
    const { default: UserSection } = await import('../../../../components/lms/configEditor/userSection.vue')
    const wrapper = mount(UserSection, { global: _globalConfig })
    expect(wrapper.text()).toContain('lmsConfig.user')
  })

  it('渲染所有 5 个开关字段', async () => {
    setupContext()
    const { default: UserSection } = await import('../../../../components/lms/configEditor/userSection.vue')
    const wrapper = mount(UserSection, { global: _globalConfig })
    expect(wrapper.text()).toContain('lmsConfig.allowSelfAvatarUpload')
    expect(wrapper.text()).toContain('lmsConfig.allowChangePassword')
    expect(wrapper.text()).toContain('lmsConfig.allowChangeEmail')
    expect(wrapper.text()).toContain('lmsConfig.allowChangeLocale')
    expect(wrapper.text()).toContain('lmsConfig.allowExportData')
  })

  it('渲染所有字段的提示文本', async () => {
    setupContext()
    const { default: UserSection } = await import('../../../../components/lms/configEditor/userSection.vue')
    const wrapper = mount(UserSection, { global: _globalConfig })
    expect(wrapper.text()).toContain('lmsConfig.allowSelfAvatarUploadHint')
    expect(wrapper.text()).toContain('lmsConfig.allowChangePasswordHint')
    expect(wrapper.text()).toContain('lmsConfig.allowChangeEmailHint')
    expect(wrapper.text()).toContain('lmsConfig.allowChangeLocaleHint')
    expect(wrapper.text()).toContain('lmsConfig.allowExportDataHint')
  })

  it('渲染 5 个 USwitch 开关', async () => {
    setupContext()
    const { default: UserSection } = await import('../../../../components/lms/configEditor/userSection.vue')
    const wrapper = mount(UserSection, { global: _globalConfig })
    expect(wrapper.findAll('.uswitch').length).toBe(5)
  })

  it('切换开关触发 config 更新', async () => {
    const config = setupContext()
    const { default: UserSection } = await import('../../../../components/lms/configEditor/userSection.vue')
    const wrapper = mount(UserSection, { global: _globalConfig })
    const checkbox = wrapper.find('.uswitch input')
    await checkbox.setValue(false)
    expect(config.user.allowSelfAvatarUpload).toBe(false)
  })
})
