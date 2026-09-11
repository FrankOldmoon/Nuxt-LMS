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
import { resetAllStubs, setMockI18n, setMockAuthUser, setMockRoute, setMockFetchHandler, useRoute, useState } from '../../../../../test/setup/nuxt-stubs'

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
    statsOnlyTrigger: ref(0),
  })
  // stub useClasses（班级列表，userClass 兜底查询用）
  ;(globalThis as any).useClasses = () => ({
    classes: ref([]),
    loadClasses: vi.fn(),
  })
  // stub useLmsPublicConfig（等级换算读取 levelStep，默认 100）
  ;(globalThis as any).useLmsPublicConfig = () => ({
    levelStep: ref(100),
  })
  // stub expToLevel（auto-import util）— 与 utils/expLevel.ts 一致的换算
  ;(globalThis as any).expToLevel = (exp: number, step?: number) => {
    const base = Math.max(1, Number(step) || 100) / 2
    const total = Math.max(0, Number(exp) || 0)
    const raw = (1 + Math.sqrt(1 + (4 * total) / base)) / 2
    return Math.max(1, Math.floor(raw))
  }
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

  it('me 返回最新章节 taskStatus 时写入 server-chapter-progress 全局状态（[cid].vue watch 应用）', async () => {
    setMockAuthUser({ id: 1, name: 'Alice', preferName: '', rollNumber: '', avatarImg: null })
    // 章节页路由（courseId + chapterId）
    setMockRoute({ params: { id: '5', cid: '26' }, query: {}, path: '/course/5/26', fullPath: '/course/5/26' })
    // me 带回服务端最新 taskStatus
    setMockFetchHandler(async (url: string) => {
      if (String(url).includes('/api/courses/me')) {
        return {
          data: {
            courseScore: 10, exp: 50, coin: 5, chapterScore: 3,
            chapterTaskStatus: { '26': true, 'h1': true },
            chapterIsPass: false,
          },
          success: true, msg: '',
        }
      }
      return { data: null, success: true, msg: '' }
    })
    const { default: UserCard } = await import('../../../components/class/userCard.vue')
    mount(UserCard, { global: _globalConfig })
    await flushPromises()
    await flushPromises()
    // me 的最新进度已写入全局状态（由章节页 watch 后应用到 chapterTaskCtx）
    const serverProgress = useState<{ chapterId: number, taskStatus: Record<string, boolean>, isPass: boolean } | null>(
      'server-chapter-progress', () => null)
    expect(serverProgress.value?.chapterId).toBe(26)
    expect(serverProgress.value?.taskStatus['26']).toBe(true)
    expect(serverProgress.value?.taskStatus['h1']).toBe(true)
    expect(serverProgress.value?.isPass).toBe(false)
  })

  it('并发 refresh 去重：同课程同章节只发一次 me；串行 refresh 各发一次', async () => {
    setMockAuthUser({ id: 1, name: 'Alice', preferName: '', rollNumber: '', avatarImg: null })
    setMockRoute({ params: { id: '5', cid: '26' }, query: {}, path: '/course/5/26', fullPath: '/course/5/26' })
    let meCallCount = 0
    setMockFetchHandler(async (url: string) => {
      if (String(url).includes('/api/courses/me')) {
        meCallCount++
        return { data: { courseScore: 1, exp: 2, coin: 3, chapterScore: 4 }, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { default: UserCard } = await import('../../../components/class/userCard.vue')
    const wrapper = mount(UserCard, { global: _globalConfig })
    await flushPromises()
    expect(meCallCount).toBe(1) // 挂载 immediate 拉取一次

    // 两次并发 refresh（同一章节）→ 去重为一次 me
    const p1 = (wrapper.vm as any).refresh()
    const p2 = (wrapper.vm as any).refresh()
    await Promise.all([p1, p2])
    await flushPromises()
    expect(meCallCount).toBe(2)

    // 串行 refresh → 每次都真实请求
    await (wrapper.vm as any).refresh()
    await flushPromises()
    expect(meCallCount).toBe(3)
  })

  it('章节切换时不再因路由 cid 变化触发额外 me（由 [cid].vue 切换流程统一触发）', async () => {
    setMockAuthUser({ id: 1, name: 'Alice', preferName: '', rollNumber: '', avatarImg: null })
    setMockRoute({ params: { id: '5', cid: '26' }, query: {}, path: '/course/5/26', fullPath: '/course/5/26' })
    let meCallCount = 0
    setMockFetchHandler(async (url: string) => {
      if (String(url).includes('/api/courses/me')) {
        meCallCount++
        return { data: { courseScore: 0, exp: 0, coin: 0, chapterScore: null }, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { default: UserCard } = await import('../../../components/class/userCard.vue')
    const wrapper = mount(UserCard, { global: _globalConfig })
    await flushPromises()
    expect(meCallCount).toBe(1)

    // 仅切换章节（courseId 不变）：不触发 me
    const route = useRoute()
    ;(route.params as any).cid = '27'
    await flushPromises()
    expect(meCallCount).toBe(1)

    // 切换课程：触发 me
    ;(route.params as any).id = '6'
    await flushPromises()
    expect(meCallCount).toBe(2)
  })
})
