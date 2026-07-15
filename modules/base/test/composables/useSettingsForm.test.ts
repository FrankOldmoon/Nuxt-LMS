/**
 * composables/useSettingsForm tests
 * @see modules/base/composables/useSettingsForm.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import {
  resetAllStubs,
  setMockFetchHandler,
  clearMockFetchHandler,
  getToastCalls,
} from '../../../../test/setup/nuxt-stubs'

// useSiteConfig is an auto-import, not exposed in nuxt-stubs, need manual stub
let refreshConfigSpy = vi.fn()
function stubSiteConfig() {
  refreshConfigSpy = vi.fn()
  ;(globalThis as any).useSiteConfig = () => ({
    refreshConfig: refreshConfigSpy,
  })
}

beforeEach(() => {
  resetAllStubs()
  clearMockFetchHandler()
  stubSiteConfig()
})

describe('composables/useSettingsForm - 初始状态', () => {
  it('loading/saving 初始为 false', async () => {
    const { useSettingsForm } = await import('../../composables/useSettingsForm')
    const { loading, saving } = useSettingsForm(ref(false))
    expect(loading.value).toBe(false)
    expect(saving.value).toBe(false)
  })

  it('form 包含默认值', async () => {
    const { useSettingsForm } = await import('../../composables/useSettingsForm')
    const { form } = useSettingsForm(ref(false))
    expect(form.value.siteTitle).toBe('AI LMS')
    expect(form.value.siteDefaultLocale).toBe('en')
    expect(form.value.sitePageSize).toBe(20)
    expect(form.value.siteAllowRegistration).toBe(false)
    expect(form.value.siteDriveQuota).toBe(1073741824)
    expect(form.value.mail).toBeDefined()
    expect(form.value.mail.port).toBe(465)
  })
})

describe('composables/useSettingsForm - loadSettings', () => {
  it('从 /api/config/list 加载并映射到 form', async () => {
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/config/list')) {
        return {
          data: [
            { key: 'site:title', value: 'My LMS' },
            { key: 'site:pageSize', value: 50 },
            { key: 'site:allowRegistration', value: true },
            { key: 'site:mail.host', value: 'smtp.example.com' },
          ],
          success: true,
          msg: '',
        }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useSettingsForm } = await import('../../composables/useSettingsForm')
    const { loadSettings, form, loading } = useSettingsForm(ref(false))
    await loadSettings()
    expect(form.value.siteTitle).toBe('My LMS')
    expect(form.value.sitePageSize).toBe(50)
    expect(form.value.siteAllowRegistration).toBe(true)
    expect(form.value.mail.host).toBe('smtp.example.com')
    // Unreturned keys keep defaults
    expect(form.value.siteDefaultLocale).toBe('en')
    expect(loading.value).toBe(false)
  })

  it('加载失败时弹错误 toast', async () => {
    setMockFetchHandler(async () => ({ data: null, success: false, msg: 'denied' }))
    const { useSettingsForm } = await import('../../composables/useSettingsForm')
    const { loadSettings, loading } = useSettingsForm(ref(false))
    await loadSettings()
    expect(loading.value).toBe(false)
    const calls = getToastCalls()
    expect(calls[0].color).toBe('error')
    expect(calls[0].title).toBe('denied')
  })
})

describe('composables/useSettingsForm - saveSettings', () => {
  it('保存成功后调用 update-batch + reload + refreshConfig，关闭弹窗', async () => {
    const urls: string[] = []
    setMockFetchHandler(async (url) => {
      urls.push(url)
      return { data: null, success: true, msg: '' }
    })
    const { useSettingsForm } = await import('../../composables/useSettingsForm')
    const isOpen = ref(true)
    const { saveSettings, saving } = useSettingsForm(isOpen)
    await saveSettings()
    expect(urls.some(u => u.includes('/api/config/update-batch'))).toBe(true)
    expect(urls.some(u => u.includes('/api/config/reload'))).toBe(true)
    expect(refreshConfigSpy).toHaveBeenCalled()
    expect(isOpen.value).toBe(false)
    expect(saving.value).toBe(false)
    const calls = getToastCalls()
    expect(calls[0].color).toBe('success')
  })

  it('保存失败时弹错误 toast 且不关闭弹窗', async () => {
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/config/update-batch')) {
        return { data: null, success: false, msg: 'validation error' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useSettingsForm } = await import('../../composables/useSettingsForm')
    const isOpen = ref(true)
    const { saveSettings } = useSettingsForm(isOpen)
    await saveSettings()
    expect(isOpen.value).toBe(true)
    const calls = getToastCalls()
    expect(calls[0].color).toBe('error')
    expect(calls[0].title).toBe('validation error')
  })

  it('registerSlotSave 注册的回调在保存时被调用', async () => {
    setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
    const { useSettingsForm } = await import('../../composables/useSettingsForm')
    let slotCalled = false
    const { registerSlotSave, saveSettings } = useSettingsForm(ref(true))
    registerSlotSave(async () => { slotCalled = true })
    await saveSettings()
    expect(slotCalled).toBe(true)
  })

  it('slot 回调抛错时弹 warning toast 但仍关闭弹窗', async () => {
    setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
    const { useSettingsForm } = await import('../../composables/useSettingsForm')
    const isOpen = ref(true)
    const { registerSlotSave, saveSettings } = useSettingsForm(isOpen)
    registerSlotSave(async () => { throw new Error('slot failed') })
    await saveSettings()
    expect(isOpen.value).toBe(false)
    const calls = getToastCalls()
    expect(calls.some(c => c.color === 'warning')).toBe(true)
  })
})

describe('composables/useSettingsForm - closeModal', () => {
  it('closeModal 关闭弹窗', async () => {
    const { useSettingsForm } = await import('../../composables/useSettingsForm')
    const isOpen = ref(true)
    const { closeModal } = useSettingsForm(isOpen)
    closeModal()
    expect(isOpen.value).toBe(false)
  })

  it('isOpen 为 undefined 时 closeModal 不抛错', async () => {
    const { useSettingsForm } = await import('../../composables/useSettingsForm')
    const { closeModal } = useSettingsForm(ref(undefined))
    expect(() => closeModal()).not.toThrow()
  })
})

describe('composables/useSettingsForm - watch isOpen', () => {
  it('isOpen 打开时自动加载配置', async () => {
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/config/list')) {
        return { data: [{ key: 'site:title', value: 'Watched' }], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useSettingsForm } = await import('../../composables/useSettingsForm')
    const isOpen = ref(false)
    const { form } = useSettingsForm(isOpen)
    isOpen.value = true
    await vi.waitFor(() => {
      expect(form.value.siteTitle).toBe('Watched')
    })
  })
})
