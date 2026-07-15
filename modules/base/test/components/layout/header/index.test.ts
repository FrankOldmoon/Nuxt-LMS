/**
 * Header component tests
 * @see modules/base/components/layout/header/index.vue
 *
 * Top navigation: logo + navigation + notification/message buttons + user menu
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n, setMockAuthUser, setMockFetchHandler } from '../../../../../../test/setup/nuxt-stubs'
import { useHeaderMenu } from '../../../../composables/useHeaderMenu'
import { useSiteConfig } from '../../../../composables/useSiteConfig'
import { useUnreadCounts } from '../../../../composables/useUnreadCounts'

// Expose composables to globalThis
;(globalThis as any).useHeaderMenu = useHeaderMenu
;(globalThis as any).useSiteConfig = useSiteConfig
;(globalThis as any).useUnreadCounts = useUnreadCounts

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
  ;(globalThis as any).useHeaderMenu = useHeaderMenu
  ;(globalThis as any).useSiteConfig = useSiteConfig
  ;(globalThis as any).useUnreadCounts = useUnreadCounts
})

const _globalStubs = {
  UHeader: {
    template: '<header class="header"><slot name="left" /><slot /><slot name="right" /><slot name="body" /></header>',
    props: ['title', 'to'],
  },
  ULink: { template: '<a><slot /></a>', props: ['to'] },
  UColorModeButton: { template: '<button class="color-mode-btn" />' },
  UButton: {
    template: '<button @click="$emit(\'click\', $event)"><slot name="leading" />{{ label }}<slot /></button>',
    props: ['icon', 'color', 'variant', 'size', 'label', 'aria-label', 'disabled', 'loading'],
    emits: ['click'],
  },
  UTooltip: { template: '<div class="tooltip">{{ text }}<slot /></div>', props: ['text', 'content'] },
  UAvatar: { template: '<div class="avatar" />', props: ['src', 'alt', 'text', 'size'] },
  UDropdownMenu: { template: '<div class="dropdown"><slot /></div>', props: ['items'] },
  UIcon: { template: '<span class="icon" />', props: ['name'] },
  // Child component stubs
  AuthLoginModal: { template: '<div class="login-modal" />', props: ['open'] },
  AuthProfileModal: { template: '<div class="profile-modal" />', props: ['open'] },
  AuthSettingsModal: { template: '<div class="settings-modal" />', props: ['open'] },
  AuthImportUsersModal: { template: '<div class="import-users-modal" />', props: ['open'] },
  LayoutNotificationModal: { template: '<div class="notification-modal" />', props: ['open'] },
  LayoutMessageModal: { template: '<div class="message-modal" />', props: ['open'] },
  FilesMyFilesModal: { template: '<div class="my-files-modal" />', props: ['open'] },
}

const _globalConfig = {
  mocks: {
    $t: (k: string) => k,
    $i18n: { t: (k: string) => k, locale: { value: 'en' } },
  },
  stubs: _globalStubs,
}

describe('layout/header/index.vue', () => {
  it('默认渲染 header 容器', async () => {
    const { default: Header } = await import('../../../../components/layout/header/index.vue')
    const wrapper = mount(Header, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.header').exists()).toBe(true)
  })

  it('未登录时显示登录按钮', async () => {
    const { default: Header } = await import('../../../../components/layout/header/index.vue')
    const wrapper = mount(Header, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.text()).toContain('auth.login')
  })

  it('登录后显示用户名', async () => {
    setMockAuthUser({ id: 1, name: 'TestUser', avatarImg: '' }, [{ code: 'student' }], [])
    const { default: Header } = await import('../../../../components/layout/header/index.vue')
    const wrapper = mount(Header, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.text()).toContain('TestUser')
  })

  it('登录后显示通知和消息按钮', async () => {
    setMockAuthUser({ id: 1, name: 'TestUser' }, [{ code: 'student' }], [])
    const { default: Header } = await import('../../../../components/layout/header/index.vue')
    const wrapper = mount(Header, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.text()).toContain('notification.title')
    expect(wrapper.text()).toContain('message.title')
  })

  it('默认显示站点标题 AI LMS', async () => {
    const { default: Header } = await import('../../../../components/layout/header/index.vue')
    const wrapper = mount(Header, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.text()).toContain('AI LMS')
  })

  it('接受 nav 和 header-right 插槽', async () => {
    const { default: Header } = await import('../../../../components/layout/header/index.vue')
    const wrapper = mount(Header, {
      global: _globalConfig,
      slots: {
        nav: '<nav class="custom-nav" />',
        'header-right': '<div class="custom-right" />',
      },
    })
    await flushPromises()
    expect(wrapper.find('.custom-nav').exists()).toBe(true)
    expect(wrapper.find('.custom-right').exists()).toBe(true)
  })
})
