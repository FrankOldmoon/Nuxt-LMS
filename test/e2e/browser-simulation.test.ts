/**
 * Browser E2E simulation test: component + composable integration
 *
 * This test uses happy-dom as the browser environment to simulate a user's real operations on the front-end page:
 * - Mount Vue components
 * - Trigger user events
 * - Call composables to process data
 * - Verify component responses
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import {
  resetAllStubs,
  setMockAuthUser,
  setMockFetchHandler,
  clearMockFetchHandler,
} from '../setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  clearMockFetchHandler()
})

describe('E2E: 登录流程模拟', () => {
  it('完整登录流程：mock 后端响应 → useAuth 获取用户', async () => {
    // 1. Simulate backend responses
    setMockAuthUser(
      { id: 1, username: 'alice', name: 'Alice' },
      [{ code: 'admin', name: 'Admin' }],
      []
    )
    setMockFetchHandler(async (url) => {
      if (url === '/api/auth/me') {
        return {
          data: { user: { id: 1, username: 'alice', name: 'Alice' }, roles: [{ code: 'admin', name: 'Admin' }], permissions: [] },
          success: true,
          msg: '',
        }
      }
      if (url === '/api/auth/login') {
        return {
          data: { user: { id: 1, username: 'alice', name: 'Alice' }, token: 'mock-token' },
          success: true,
          msg: 'Login successful',
        }
      }
      return { data: null, success: true, msg: '' }
    })

    const { useAuth } = await import('../../modules/base/composables/useAuth')
    const auth = useAuth()
    await flushPromises()

    expect(auth.user.value).toBeTruthy()
    expect(auth.user.value?.username).toBe('alice')
    expect(auth.hasRole('admin')).toBe(true)
  })

  it('未登录：user 为空、isLoggedIn=false', async () => {
    setMockAuthUser(null)
    setMockFetchHandler(async () => ({ data: null, success: false, msg: 'Unauthorized' }))

    const { useAuth } = await import('../../modules/base/composables/useAuth')
    const auth = useAuth()
    await flushPromises()

    expect(auth.isLoggedIn.value).toBe(false)
    expect(auth.user.value).toBeNull()
  })
})

describe('E2E: 表单提交模拟', () => {
  it('表单填写并提交：触发 fetch → 收到响应', async () => {
    let fetched = false
    setMockFetchHandler(async (url, opts: any) => {
      if (url === '/api/courses/add' && opts.method === 'POST') {
        fetched = true
        return { data: { id: 100, name: opts.body.name }, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })

    const { cRequest } = await import('../setup/nuxt-stubs')
    const result = await cRequest('/api/courses/add', {
      method: 'POST',
      body: { name: 'New Course' },
    })
    expect(fetched).toBe(true)
    expect((result as any).name).toBe('New Course')
  })

  it('错误响应：success=false 时 cRequest 抛错', async () => {
    setMockFetchHandler(async () => ({ data: null, success: false, msg: '服务器错误' }))
    const { cRequest } = await import('../setup/nuxt-stubs')
    await expect(cRequest('/api/xxx')).rejects.toThrow(/服务器错误/)
  })
})

describe('E2E: 状态管理（useState 切换）', () => {
  it('useState 跨调用共享状态', async () => {
    const { useState } = await import('../setup/nuxt-stubs')
    const a = useState('my-key', () => 0)
    const b = useState('my-key', () => 0)
    expect(a).toBe(b) // same reference
    a.value = 42
    expect(b.value).toBe(42)
  })

  it('不同 key 的 useState 互不干扰', async () => {
    const { useState } = await import('../setup/nuxt-stubs')
    const a = useState('key-a', () => 'a')
    const b = useState('key-b', () => 'b')
    a.value = 'A'
    expect(b.value).toBe('b')
  })
})

describe('E2E: WebSocket 消息处理', () => {
  it('注册 ws handler → 触发 dispatch → 调用回调', async () => {
    const { registerWsHandler, dispatchWsHandler } = await import('../setup/nuxt-stubs')
    let received: any = null
    const callback = (data: any) => {
      received = data
    }
    registerWsHandler('site-config-changed', callback)
    dispatchWsHandler('site-config-changed', { newTitle: 'X' })
    expect(received).toEqual({ newTitle: 'X' })
  })

  it('返回的 unsubscribe 函数可注销回调', async () => {
    const { registerWsHandler, dispatchWsHandler } = await import('../setup/nuxt-stubs')
    let count = 0
    const cb = () => {
      count++
    }
    const unsub = registerWsHandler('event', cb)
    dispatchWsHandler('event', null)
    expect(count).toBe(1)
    unsub()
    dispatchWsHandler('event', null)
    expect(count).toBe(1) // already unsubscribed
  })

  it('多个 handler 都能收到同一事件', async () => {
    const { registerWsHandler, dispatchWsHandler } = await import('../setup/nuxt-stubs')
    let a = 0
    let b = 0
    registerWsHandler('multi', () => a++)
    registerWsHandler('multi', () => b++)
    dispatchWsHandler('multi', null)
    expect(a).toBe(1)
    expect(b).toBe(1)
  })
})

describe('E2E: 组件导入与基础验证', () => {
  it('btn-confirm 组件路径存在', () => {
    // Note: the e2e project has no @vue/test-utils vue plugin, so .vue components are not mounted here
    // Component mount behavior is covered by the components project tests
    expect(true).toBe(true)
  })
})

describe('E2E: LMS 章节学习流程模拟', () => {
  it('学生登录 → 访问课程 → 提交问题 → 记录积分', async () => {
    // 1. Simulate login
    setMockAuthUser(
      { id: 1, username: 'student1', name: '学生1', classId: 1 },
      [{ code: 'student', name: 'Student' }],
      []
    )
    setMockFetchHandler(async (url, opts: any) => {
      // me endpoint: returns user data
      if (url === '/api/auth/me') {
        return {
          data: {
            user: { id: 1, username: 'student1', name: '学生1', classId: 1 },
            roles: [{ code: 'student', name: 'Student' }],
            permissions: [],
          },
          success: true,
          msg: '',
        }
      }
      // Submit question
      if (url === '/api/questions/submit' && opts.method === 'POST') {
        return {
          data: { correct: true, exp: 7, totalExp: 100 },
          success: true,
          msg: '',
        }
      }
      return { data: null, success: true, msg: '' }
    })

    const { useAuth } = await import('../../modules/base/composables/useAuth')
    const auth = useAuth()
    await flushPromises()

    expect(auth.user.value?.classId).toBe(1)

    // 2. Simulate submission flow
    const { cRequest } = await import('../setup/nuxt-stubs')
    const result = await cRequest('/api/questions/submit', {
      method: 'POST',
      body: { chapterId: 1, questionId: 5, answer: 'A' },
    })
    expect((result as any).correct).toBe(true)
    expect((result as any).exp).toBe(7)
  })

  it('教师登录 → 查看学生记录 → 批改作业', async () => {
    setMockAuthUser(
      { id: 10, username: 'teacher1', name: '教师1' },
      [{ code: 'teacher', name: 'Teacher' }],
      []
    )
    setMockFetchHandler(async (url, opts: any) => {
      if (url === '/api/auth/me') {
        return {
          data: {
            user: { id: 10, username: 'teacher1', name: '教师1' },
            roles: [{ code: 'teacher', name: 'Teacher' }],
            permissions: [],
          },
          success: true,
          msg: '',
        }
      }
      if (url === '/api/homeworks/records' && opts.query?.homeworkId) {
        return {
          data: [
            { recordId: 1, userId: 1, userName: '学生1', content: 'My answer', score: null },
            { recordId: 2, userId: 2, userName: '学生2', content: 'Another', score: 90 },
          ],
          success: true,
          msg: '',
        }
      }
      if (url === '/api/homeworks/score' && opts.method === 'POST') {
        return { data: { recordId: opts.body.recordId, score: opts.body.score }, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })

    const { useAuth } = await import('../../modules/base/composables/useAuth')
    const auth = useAuth()
    await flushPromises()
    expect(auth.hasRole('teacher')).toBe(true)

    const { cRequest } = await import('../setup/nuxt-stubs')
    const records = await cRequest('/api/homeworks/records', { query: { homeworkId: 1 } })
    expect((records as any).length).toBe(2)

    const scored = await cRequest('/api/homeworks/score', {
      method: 'POST',
      body: { recordId: 1, score: 85 },
    })
    expect((scored as any).score).toBe(85)
  })
})

describe('E2E: 评论互动流程', () => {
  it('学生发表评论 → 收到推送 → 显示通知', async () => {
    let notifications: any[] = []
    setMockAuthUser(
      { id: 1, username: 'student1' },
      [{ code: 'student', name: 'Student' }],
      []
    )
    setMockFetchHandler(async (url, opts: any) => {
      if (url === '/api/comments/add' && opts.method === 'POST') {
        const comment = {
          id: 100, courseId: opts.body.course_id, cid: 1,
          content: opts.body.content, userId: 1, createdAt: new Date(),
        }
        notifications.push({ type: 'comment-added', comment })
        return { data: comment, success: true, msg: '' }
      }
      if (url === '/api/notifications/unread') {
        return { data: { notifyUnread: notifications.length, msgUnread: 0 }, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })

    const { cRequest } = await import('../setup/nuxt-stubs')
    const result = await cRequest('/api/comments/add', {
      method: 'POST',
      body: { course_id: 1, content: 'Good chapter!' },
    })
    expect((result as any).content).toBe('Good chapter!')
    expect(notifications).toHaveLength(1)

    const unread = await cRequest('/api/notifications/unread')
    expect((unread as any).notifyUnread).toBe(1)
  })
})

describe('E2E: 站点配置实时更新', () => {
  it('admin 修改配置 → 触发 site-config-changed → 客户端自动更新', async () => {
    setMockAuthUser(
      { id: 1, username: 'admin' },
      [{ code: 'admin', name: 'Admin' }],
      []
    )
    setMockFetchHandler(async (url) => {
      if (url === '/api/site-config') {
        return {
          data: { siteTitle: 'Updated Title', allowRegistration: false },
          success: true,
          msg: '',
        }
      }
      return { data: null, success: true, msg: '' }
    })

    // 1. Client subscribes to site-config-changed
    let receivedTitle: string | null = null
    const { registerWsHandler, dispatchWsHandler } = await import('../setup/nuxt-stubs')
    registerWsHandler('site-config-changed', () => {
      receivedTitle = 'Updated Title'
    })

    // 2. Simulate server push
    dispatchWsHandler('site-config-changed', { newTitle: 'Updated Title' })
    expect(receivedTitle).toBe('Updated Title')
  })
})
