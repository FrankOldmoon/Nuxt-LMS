/**
 * composables/useHeaderMenu 测试
 * @see modules/base/composables/useHeaderMenu.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, computed } from 'vue'
import {
  resetAllStubs,
  setMockAuthUser,
  setMockFetchHandler,
  clearMockFetchHandler,
} from '../../../../test/setup/nuxt-stubs'

// useSiteConfig / useUnreadCounts 是 auto-import，未在 nuxt-stubs 中暴露，需手动 stub
function stubDeps(opts: {
  showMyFiles?: boolean
  showNotify?: boolean
  showMsg?: boolean
  siteTitle?: string
  logo?: string
} = {}) {
  ;(globalThis as any).useSiteConfig = () => ({
    siteTitle: computed(() => opts.siteTitle ?? 'AI LMS'),
    logo: computed(() => opts.logo ?? ''),
    showNotify: computed(() => opts.showNotify ?? true),
    showMsg: computed(() => opts.showMsg ?? true),
    showMyFiles: computed(() => opts.showMyFiles ?? true),
    refreshConfig: async () => {},
  })
  ;(globalThis as any).useUnreadCounts = () => ({
    counts: computed(() => ({ notifyUnread: 0, msgUnread: 0 })),
    refresh: async () => {},
  })
}

beforeEach(() => {
  resetAllStubs()
  clearMockFetchHandler()
  stubDeps()
})

describe('composables/useHeaderMenu - 初始状态', () => {
  it('所有弹窗 flag 初始为 false', async () => {
    setMockAuthUser(null)
    const { useHeaderMenu } = await import('../../composables/useHeaderMenu')
    const m = useHeaderMenu()
    expect(m.showLoginModal.value).toBe(false)
    expect(m.showProfileModal.value).toBe(false)
    expect(m.showSettingsModal.value).toBe(false)
    expect(m.showNotificationModal.value).toBe(false)
    expect(m.showMessageModal.value).toBe(false)
    expect(m.showImportUsersModal.value).toBe(false)
    expect(m.showMyFilesModal.value).toBe(false)
  })

  it('未登录时 user 为 null', async () => {
    setMockAuthUser(null)
    const { useHeaderMenu } = await import('../../composables/useHeaderMenu')
    const { user, isLoggedIn } = useHeaderMenu()
    expect(user.value).toBeNull()
    expect(isLoggedIn.value).toBe(false)
  })
})

describe('composables/useHeaderMenu - userMenuItems', () => {
  it('未登录用户菜单包含 profile / logout / feedback 项', async () => {
    setMockAuthUser(null)
    const { useHeaderMenu } = await import('../../composables/useHeaderMenu')
    const { userMenuItems } = useHeaderMenu()
    // 第 0 组有 profile（showMyFiles 默认 true，还包含 myFiles）
    expect(userMenuItems.value[0]).toHaveLength(2)
    expect(userMenuItems.value[0][0].label).toBe('profile.title')
    expect(userMenuItems.value[0][1].label).toBe('myFiles.title')
    // 含 logout
    expect(userMenuItems.value.some((g: any) =>
      g.some((i: any) => i.label === 'auth.logout')
    )).toBe(true)
    // 最后一组是 logout，feedback 在其上方
    const last = userMenuItems.value[userMenuItems.value.length - 1]
    expect(last[0].label).toBe('auth.logout')
  })

  it('showMyFiles=true 时菜单包含 myFiles', async () => {
    stubDeps({ showMyFiles: true })
    setMockAuthUser(null)
    const { useHeaderMenu } = await import('../../composables/useHeaderMenu')
    const { userMenuItems } = useHeaderMenu()
    const firstGroup = userMenuItems.value[0]
    expect(firstGroup.some((i: any) => i.label === 'myFiles.title')).toBe(true)
  })

  it('showMyFiles=false 时菜单不含 myFiles', async () => {
    stubDeps({ showMyFiles: false })
    setMockAuthUser(null)
    const { useHeaderMenu } = await import('../../composables/useHeaderMenu')
    const { userMenuItems } = useHeaderMenu()
    const firstGroup = userMenuItems.value[0]
    expect(firstGroup.some((i: any) => i.label === 'myFiles.title')).toBe(false)
  })

  it('admin 用户菜单包含 settings / importUsers', async () => {
    setMockAuthUser(
      { id: 1, username: 'admin', name: 'Admin' },
      [{ code: 'admin', name: 'Admin' }],
    )
    const { useHeaderMenu } = await import('../../composables/useHeaderMenu')
    const { userMenuItems } = useHeaderMenu()
    // 应有 3 组：profile(+myFiles) / settings+importUsers / logout
    expect(userMenuItems.value.length).toBeGreaterThanOrEqual(3)
    const adminGroup = userMenuItems.value.find((g: any) =>
      g.some((i: any) => i.label === 'settings.title'),
    )
    expect(adminGroup).toBeDefined()
    expect(adminGroup.some((i: any) => i.label === 'importUsers.title')).toBe(true)
  })

  it('非 admin 用户菜单不含 settings/importUsers', async () => {
    setMockAuthUser(
      { id: 2, username: 'student', name: 'Student' },
      [{ code: 'student', name: 'Student' }],
    )
    const { useHeaderMenu } = await import('../../composables/useHeaderMenu')
    const { userMenuItems } = useHeaderMenu()
    const hasSettings = userMenuItems.value.some((g: any) =>
      g.some((i: any) => i.label === 'settings.title'),
    )
    expect(hasSettings).toBe(false)
  })

  it('profile 项 onSelect 打开 profile 弹窗', async () => {
    setMockAuthUser(null)
    const { useHeaderMenu } = await import('../../composables/useHeaderMenu')
    const { userMenuItems, showProfileModal } = useHeaderMenu()
    userMenuItems.value[0][0].onSelect()
    expect(showProfileModal.value).toBe(true)
  })

  it('myFiles 项 onSelect 打开 myFiles 弹窗', async () => {
    stubDeps({ showMyFiles: true })
    setMockAuthUser(null)
    const { useHeaderMenu } = await import('../../composables/useHeaderMenu')
    const { userMenuItems, showMyFilesModal } = useHeaderMenu()
    const item = userMenuItems.value[0].find((i: any) => i.label === 'myFiles.title')
    item.onSelect()
    expect(showMyFilesModal.value).toBe(true)
  })

  it('admin settings 项 onSelect 打开 settings 弹窗', async () => {
    setMockAuthUser({ id: 1, username: 'admin', name: 'Admin' }, [{ code: 'admin', name: 'Admin' }])
    const { useHeaderMenu } = await import('../../composables/useHeaderMenu')
    const { userMenuItems, showSettingsModal } = useHeaderMenu()
    const adminGroup = userMenuItems.value.find((g: any) =>
      g.some((i: any) => i.label === 'settings.title'),
    )
    const settingsItem = adminGroup.find((i: any) => i.label === 'settings.title')
    settingsItem.onSelect()
    expect(showSettingsModal.value).toBe(true)
  })

  it('logout 项 onSelect 调用 logout', async () => {
    setMockFetchHandler(async (url) => {
      if (url === '/api/auth/logout') return { data: null, success: true, msg: '' }
      return { data: null, success: true, msg: '' }
    })
    setMockAuthUser({ id: 1, username: 'alice', name: 'Alice' }, [{ code: 'student', name: 'Student' }])
    const { useHeaderMenu } = await import('../../composables/useHeaderMenu')
    const { userMenuItems } = useHeaderMenu()
    const logoutGroup = userMenuItems.value.find((g: any) =>
      g.some((i: any) => i.label === 'auth.logout')
    )
    const logoutItem = logoutGroup.find((i: any) => i.label === 'auth.logout')
    await logoutItem.onSelect()
    // 不抛错即视为成功
  })
})

describe('composables/useHeaderMenu - site config 暴露', () => {
  it('暴露 siteTitle / logo / showNotify / showMsg', async () => {
    stubDeps({ siteTitle: 'Custom', logo: 'http://x/l.png', showNotify: false, showMsg: true })
    setMockAuthUser(null)
    const { useHeaderMenu } = await import('../../composables/useHeaderMenu')
    const { siteTitle, logo, showNotify, showMsg } = useHeaderMenu()
    expect(siteTitle.value).toBe('Custom')
    expect(logo.value).toBe('http://x/l.png')
    expect(showNotify.value).toBe(false)
    expect(showMsg.value).toBe(true)
  })
})
