/**
 * peertube/upload.post.ts 端点测试：仅教师/管理员可上传视频
 * @see modules/lms/server/api/peertube/upload.post.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  createMockDb, resetDb, installLmsAutoImports, makeEvent,
} from '../../../../test/setup/db-helpers'

const _mockDb = createMockDb()
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: {} }))

import { resetAllStubs, setMockAuthState } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  resetDb(_mockDb)
  installLmsAutoImports()
})

describe('API: peertube/upload.post', () => {
  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/peertube/upload.post')).default
    await expect(handler(makeEvent())).rejects.toThrow()
  })

  it('非教师/管理员（学生）被拒', async () => {
    setMockAuthState({ id: 2, username: 'stu', name: 'Stu', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/peertube/upload.post')).default
    const r = await handler(makeEvent())
    expect(r.success).toBe(false)
  })

  it('管理员/教师可通过权限，无文件时提示未收到文件', async () => {
    // readMultipartFormData 返回空 → 进入"未收到文件"分支（证明已通过角色校验）
    ;(globalThis as any).readMultipartFormData = vi.fn().mockResolvedValue([])
    setMockAuthState({ id: 1, username: 't', name: 'Tea', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/peertube/upload.post')).default
    const r = await handler(makeEvent())
    expect(r.success).toBe(false)
    expect((r.msg || '').includes('未收到')).toBe(true)
  })
})