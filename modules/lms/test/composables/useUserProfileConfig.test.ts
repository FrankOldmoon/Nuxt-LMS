/**
 * useUserProfileConfig composable test
 * @see modules/lms/composables/useUserProfileConfig.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import {
  resetAllStubs,
  setMockI18n,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
})

describe('composables/useUserProfileConfig', () => {
  it('所有开关默认为 true', async () => {
    const { useUserProfileConfig } = await import('../../composables/useUserProfileConfig')
    const {
      allowSelfAvatarUpload,
      allowChangePassword,
      allowChangeEmail,
      allowChangeLocale,
      allowExportData,
    } = useUserProfileConfig()
    expect(allowSelfAvatarUpload.value).toBe(true)
    expect(allowChangePassword.value).toBe(true)
    expect(allowChangeEmail.value).toBe(true)
    expect(allowChangeLocale.value).toBe(true)
    expect(allowExportData.value).toBe(true)
  })

  it('user 配置为 false 时开关为 false', async () => {
    const { useLmsPublicConfig } = await import('../../composables/useLmsPublicConfig')
    const { useUserProfileConfig } = await import('../../composables/useUserProfileConfig')
    // useLmsPublicConfig is explicitly imported, directly operates on its config
    const { config } = useLmsPublicConfig()
    config.value = {
      user: {
        allowSelfAvatarUpload: false,
        allowChangePassword: false,
        allowChangeEmail: false,
        allowChangeLocale: false,
        allowExportData: false,
      },
    }
    const {
      allowSelfAvatarUpload,
      allowChangePassword,
      allowChangeEmail,
      allowChangeLocale,
      allowExportData,
    } = useUserProfileConfig()
    expect(allowSelfAvatarUpload.value).toBe(false)
    expect(allowChangePassword.value).toBe(false)
    expect(allowChangeEmail.value).toBe(false)
    expect(allowChangeLocale.value).toBe(false)
    expect(allowExportData.value).toBe(false)
  })

  it('部分开关为 false 时仅对应开关为 false', async () => {
    const { useLmsPublicConfig } = await import('../../composables/useLmsPublicConfig')
    const { useUserProfileConfig } = await import('../../composables/useUserProfileConfig')
    const { config } = useLmsPublicConfig()
    config.value = {
      user: {
        allowChangePassword: false,
        allowExportData: false,
      },
    }
    const {
      allowSelfAvatarUpload,
      allowChangePassword,
      allowChangeEmail,
      allowChangeLocale,
      allowExportData,
    } = useUserProfileConfig()
    expect(allowSelfAvatarUpload.value).toBe(true)
    expect(allowChangePassword.value).toBe(false)
    expect(allowChangeEmail.value).toBe(true)
    expect(allowChangeLocale.value).toBe(true)
    expect(allowExportData.value).toBe(false)
  })

  it('refresh 函数可用', async () => {
    const { useUserProfileConfig } = await import('../../composables/useUserProfileConfig')
    const { refresh } = useUserProfileConfig()
    await expect(refresh()).resolves.toBeUndefined()
  })
})
