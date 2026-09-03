/**
 * class/userCard.vue 组件测试
 * @see modules/lms/components/class/userCard.vue
 *
 * 用户卡片：头像 + 姓名 + 学号 + 奖章 + 等级/经验/积分（课程上下文）。
 * 使用 useUserCardSetup（来自 ./useUserCard.ts），内部依赖 useAuth/useMedals/useUserCard。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, computed } from 'vue'
import { resetAllStubs, setMockI18n, setMockAuthUser, setMockRoute, setMockFetchHandler } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  // stub fetch handler so cRequest('/api/courses/me') returns proper stats
  setMockFetchHandler(async (url: string) => {
    if (String(url).includes('/api/courses/me')) {
      return { data: { courseScore: 0, exp: 0, coin: 0, chapterScore: null }, success: true, msg: '' }
    }
    return { data: null, success: true, msg: '' }
  })
  // stub useMedals（auto-import）
  ;(globalThis as any).useMedals = () => ({
    myMedals: ref([]),
    fetchMyMedals: vi.fn(),
    checkMedals: vi.fn(),
  })
  // stub useUserCard（全局 composable，返回 refreshTrigger）
  ;(globalThis as any).useUserCard = () => ({
    refreshTrigger: ref(0),
  })
  // stub useLmsPublicConfig（等级换算读取 levelStep，默认 100）
  ;(globalThis as any).useLmsPublicConfig = () => ({
    levelStep: ref(100),
  })
})

const _globalStubs = {
  UCard: { template: '<div class="ucard"><slot /></div>', props: ['ui'] },
  UAvatar: {
    template: '<span class="avatar">{{ alt || text }}</span>',
    props: ['src', 'alt', 'text', 'size'],
  },
  UTooltip: { template: '<span class="tooltip"><slot /></span>', props: ['text'] },
  UIcon: { template: '<span class="icon" />', props: ['name'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('class/userCard.vue', () => {
  it('用户已登录时渲染卡片', async () => {
    setMockAuthUser({ id: 1, name: 'Alice', preferName: 'Al', username: 'S001', avatarImg: null })
    setMockRoute({ params: {}, query: {}, path: '/', fullPath: '/' })
    const { default: UserCard } = await import('../../../components/class/userCard.vue')
    const wrapper = mount(UserCard, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.ucard').exists()).toBe(true)
    expect(wrapper.text()).toContain('Alice')
  })

  it('显示 name 优先于 preferName', async () => {
    setMockAuthUser({ id: 1, name: 'Alice', preferName: 'Ally', username: '', avatarImg: null })
    setMockRoute({ params: {}, query: {}, path: '/', fullPath: '/' })
    const { default: UserCard } = await import('../../../components/class/userCard.vue')
    const wrapper = mount(UserCard, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).not.toContain('Ally')
  })

  it('显示 username 而非 rollNumber', async () => {
    setMockAuthUser({ id: 1, name: 'Alice', preferName: '', username: 'R001', rollNumber: 'S1', avatarImg: null })
    setMockRoute({ params: {}, query: {}, path: '/', fullPath: '/' })
    const { default: UserCard } = await import('../../../components/class/userCard.vue')
    const wrapper = mount(UserCard, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.text()).toContain('R001')
    expect(wrapper.text()).not.toContain('S1')
  })

  it('用户未登录时不渲染卡片', async () => {
    // 不调用 setMockAuthUser → user 为 null
    setMockRoute({ params: {}, query: {}, path: '/', fullPath: '/' })
    const { default: UserCard } = await import('../../../components/class/userCard.vue')
    const wrapper = mount(UserCard, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.ucard').exists()).toBe(false)
  })

  it('课程上下文中显示等级和积分信息', async () => {
    setMockAuthUser({ id: 1, name: 'Alice', preferName: '', rollNumber: '', avatarImg: null })
    setMockRoute({ params: { id: '5' }, query: {}, path: '/course/5', fullPath: '/course/5' })
    const { default: UserCard } = await import('../../../components/class/userCard.vue')
    const wrapper = mount(UserCard, { global: _globalConfig })
    await flushPromises()
    // hasCourse 为 true 时显示 Lv. 和 EXP
    expect(wrapper.text()).toContain('Lv.')
    expect(wrapper.text()).toContain('EXP')
    expect(wrapper.text()).toContain('userCard.courseScore')
  })

  it('expose refresh 方法', async () => {
    setMockAuthUser({ id: 1, name: 'Alice', preferName: '', rollNumber: '', avatarImg: null })
    setMockRoute({ params: {}, query: {}, path: '/', fullPath: '/' })
    const { default: UserCard } = await import('../../../components/class/userCard.vue')
    const wrapper = mount(UserCard, { global: _globalConfig })
    await flushPromises()
    expect(typeof (wrapper.vm as any).refresh).toBe('function')
  })
})
