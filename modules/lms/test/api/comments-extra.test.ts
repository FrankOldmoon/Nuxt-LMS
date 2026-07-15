/**
 * LMS Comments endpoint test
 * @see modules/lms/server/api/comments/*.ts
 *
 * Coverage:
 * - add.post.ts     add (auto-assign cid + checkAndAwardMedals)
 * - batch.post.ts   batch (delete/remove/restore)
 * - delete.post.ts  delete (author themselves or teacher/admin)
 * - like.post.ts    like (upsert userComments)
 * - list.get.ts     list (root + children + userMap + likeCount)
 * - records.get.ts  class student records
 * - show.ts         single detail
 * - update.post.ts  update (teacher/admin)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  createMockDb, resetDb, installLmsAutoImports, makeEvent,
} from '../../../../test/setup/db-helpers'

const _mockDb = createMockDb()
const _mockSchema: any = {
  comments: { id: 'id', courseId: 'courseId', cid: 'cid', name: 'name', content: 'content', tags: 'tags', point: 'point', userId: 'userId', parentId: 'parentId', status: 'status', createdAt: 'createdAt', deletedAt: 'deletedAt' },
  userComments: { userId: 'userId', courseId: 'courseId', commentCid: 'commentCid', like: 'like' },
  users: { id: 'id', name: 'name', avatarImg: 'avatarImg', defaultClass: 'defaultClass' },
  userClasses: { userId: 'userId', classId: 'classId' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

import { resetAllStubs, setMockAuthState } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  resetDb(_mockDb)
  installLmsAutoImports()
})

// ====================== add.post.ts ======================

describe('API: comments/add', () => {
  it('未登录抛 401', async () => {
    const handler = (await import('../../server/api/comments/add.post')).default
    await expect(handler(makeEvent({ body: { course_id: 1, content: 'hi' } }))).rejects.toThrow()
  })

  it('缺少 course_id 返回失败', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/comments/add.post')).default
    const r = await handler(makeEvent({ body: { content: 'hi' } }))
    expect(r.success).toBe(false)
  })

  it('首次添加评论 cid=1', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValueOnce([]) // no existing comments
    const handler = (await import('../../server/api/comments/add.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, content: 'hi' } }))
    expect(r.success).toBe(true)
  })

  it('已有评论时 cid 递增', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValueOnce([{ cid: 5 }]) // max cid = 5
    const handler = (await import('../../server/api/comments/add.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, content: 'hi' } }))
    expect(r.success).toBe(true)
  })

  it('携带 parentId/tags/point 参数', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValueOnce([])
    const handler = (await import('../../server/api/comments/add.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, content: 'reply', parentId: 2, tags: ['x'], point: 5 } }))
    expect(r.success).toBe(true)
  })

  it('tags 非数组会被规范为空数组', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValueOnce([])
    const handler = (await import('../../server/api/comments/add.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, content: 'hi', tags: 'invalid' } }))
    expect(r.success).toBe(true)
  })
})

// ====================== batch.post.ts ======================

describe('API: comments/batch', () => {
  it('非管理员被拒', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/comments/batch.post')).default
    await expect(handler(makeEvent({ body: { rows: [{ courseId: 1, cid: 1 }], action: 'delete' } }))).rejects.toThrow()
  })

  it('rows 为空返回失败', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/comments/batch.post')).default
    const r = await handler(makeEvent({ body: { rows: [], action: 'delete' } }))
    expect(r.success).toBe(false)
  })

  it('无效 action 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/comments/batch.post')).default
    const r = await handler(makeEvent({ body: { rows: [{ courseId: 1, cid: 1 }], action: 'invalid' } }))
    expect(r.success).toBe(false)
  })

  it('action=delete 软删除', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/comments/batch.post')).default
    const r = await handler(makeEvent({ body: { rows: [{ courseId: 1, cid: 1 }, { courseId: 1, cid: 2 }], action: 'delete' } }))
    expect(r.success).toBe(true)
    expect(r.data.count).toBe(2)
  })

  it('action=remove 物理删除', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/comments/batch.post')).default
    const r = await handler(makeEvent({ body: { rows: [{ courseId: 1, cid: 1 }], action: 'remove' } }))
    expect(r.success).toBe(true)
  })

  it('action=restore 恢复', async () => {
    setMockAuthState({ id: 1, username: 'a', name: 'a', roles: ['admin'], permissions: [] })
    const handler = (await import('../../server/api/comments/batch.post')).default
    const r = await handler(makeEvent({ body: { rows: [{ courseId: 1, cid: 1 }], action: 'restore' } }))
    expect(r.success).toBe(true)
  })
})

// ====================== delete.post.ts ======================

describe('API: comments/delete', () => {
  it('未登录抛 401', async () => {
    const handler = (await import('../../server/api/comments/delete.post')).default
    await expect(handler(makeEvent({ body: { course_id: 1, cid: 1 } }))).rejects.toThrow()
  })

  it('缺少参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/comments/delete.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1 } }))
    expect(r.success).toBe(false)
  })

  it('评论不存在返回失败', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    _mockDb.query.comments.findFirst = vi.fn().mockResolvedValue(null)
    const handler = (await import('../../server/api/comments/delete.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, cid: 1 } }))
    expect(r.success).toBe(false)
  })

  it('非作者非教师被拒', async () => {
    setMockAuthState({ id: 1, username: 's1', name: 's1', roles: ['student'], permissions: [] })
    _mockDb.query.comments.findFirst = vi.fn().mockResolvedValue({ userId: 2, courseId: 1, cid: 1 })
    const handler = (await import('../../server/api/comments/delete.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, cid: 1 } }))
    expect(r.success).toBe(false)
  })

  it('作者本人可删除', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    _mockDb.query.comments.findFirst = vi.fn().mockResolvedValue({ userId: 1, courseId: 1, cid: 1 })
    const handler = (await import('../../server/api/comments/delete.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, cid: 1 } }))
    expect(r.success).toBe(true)
    expect(r.data.deleted).toBe(true)
  })

  it('教师可删除他人评论', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    _mockDb.query.comments.findFirst = vi.fn().mockResolvedValue({ userId: 2, courseId: 1, cid: 1 })
    const handler = (await import('../../server/api/comments/delete.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, cid: 1 } }))
    expect(r.success).toBe(true)
  })
})

// ====================== like.post.ts ======================

describe('API: comments/like', () => {
  it('未登录抛 401', async () => {
    const handler = (await import('../../server/api/comments/like.post')).default
    await expect(handler(makeEvent({ body: { course_id: 1, comment_cid: 1, like: true } }))).rejects.toThrow()
  })

  it('缺少参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/comments/like.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1 } }))
    expect(r.success).toBe(false)
  })

  it('新建点赞记录', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    _mockDb.query.userComments.findFirst = vi.fn().mockResolvedValue(null)
    const handler = (await import('../../server/api/comments/like.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, comment_cid: 1, like: true } }))
    expect(r.success).toBe(true)
  })

  it('更新已存在点赞', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    _mockDb.query.userComments.findFirst = vi.fn().mockResolvedValue({ userId: 1, courseId: 1, commentCid: 1, like: false })
    const handler = (await import('../../server/api/comments/like.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, comment_cid: 1, like: true } }))
    expect(r.success).toBe(true)
  })

  it('取消点赞', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    _mockDb.query.userComments.findFirst = vi.fn().mockResolvedValue({ userId: 1, courseId: 1, commentCid: 1, like: true })
    const handler = (await import('../../server/api/comments/like.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, comment_cid: 1, like: false } }))
    expect(r.success).toBe(true)
  })
})

// ====================== list.get.ts ======================

describe('API: comments/list', () => {
  it('未登录抛 401', async () => {
    const handler = (await import('../../server/api/comments/list.get')).default
    await expect(handler(makeEvent({ query: { course_id: '1', cid: '1' } }))).rejects.toThrow()
  })

  it('缺少参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/comments/list.get')).default
    const r = await handler(makeEvent({ query: { course_id: '1' } }))
    expect(r.success).toBe(false)
  })

  it('root 不存在返回空', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    _mockDb.query.comments.findFirst = vi.fn().mockResolvedValue(null)
    const handler = (await import('../../server/api/comments/list.get')).default
    const r = await handler(makeEvent({ query: { course_id: '1', cid: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data.root).toBeNull()
    expect(r.data.children).toEqual([])
  })

  it('返回 root + children + 点赞统计', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    _mockDb.query.comments.findFirst = vi.fn().mockResolvedValue({ courseId: 1, cid: 1, userId: 10, content: 'root', createdAt: '2024-01-01' })
    _mockDb.query.comments.findMany = vi.fn().mockResolvedValue([
      { courseId: 1, cid: 2, userId: 20, content: 'c1', parentId: 1, createdAt: '2024-01-02' },
      { courseId: 1, cid: 3, userId: 30, content: 'c2', parentId: 1, createdAt: '2024-01-03' },
    ])
    _mockDb.query.users.findMany = vi.fn().mockResolvedValue([
      { id: 10, name: 'Alice', avatarImg: 'a' },
      { id: 20, name: 'Bob', avatarImg: 'b' },
      { id: 30, name: 'Carol', avatarImg: 'c' },
    ])
    _mockDb.query.userComments.findMany = vi.fn().mockResolvedValue([
      { userId: 99, courseId: 1, commentCid: 2, like: true },
      { userId: 1, courseId: 1, commentCid: 2, like: true }, // current user liked cid 2
    ])
    const handler = (await import('../../server/api/comments/list.get')).default
    const r = await handler(makeEvent({ query: { course_id: '1', cid: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data.root.userName).toBe('Alice')
    expect(r.data.children).toHaveLength(2)
    expect(r.data.children[0].cid).toBe(2) // higher likeCount first
    expect(r.data.children[0].likeCount).toBe(2)
    expect(r.data.children[0].liked).toBe(true)
  })
})

// ====================== records.get.ts ======================

describe('API: comments/records', () => {
  it('非教师被拒', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/comments/records.get')).default
    await expect(handler(makeEvent({ query: { course_id: '1', cid: '1' } }))).rejects.toThrow()
  })

  it('缺少参数返回失败', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/comments/records.get')).default
    const r = await handler(makeEvent({ query: {} }))
    expect(r.success).toBe(false)
  })

  it('无 defaultClass 返回空数组', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValueOnce([{ defaultClass: null }])
    const handler = (await import('../../server/api/comments/records.get')).default
    const r = await handler(makeEvent({ query: { course_id: '1', cid: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data).toEqual([])
  })

  it('返回班级学生评论记录', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    _mockDb.limit = vi.fn().mockResolvedValueOnce([{ defaultClass: { id: 5 } }])
    ;(globalThis as any).getClassUsers = vi.fn().mockResolvedValue([
      { id: 100, isTeacher: false },
      { id: 200, isTeacher: false },
    ])
    _mockDb.query.comments.findMany = vi.fn().mockResolvedValue([
      { courseId: 1, cid: 1, userId: 100, content: 'root', createdAt: '2024-01-01' },
      { courseId: 1, cid: 2, userId: 100, content: 'reply', parentId: 1, createdAt: '2024-01-02' },
    ])
    _mockDb.query.userComments.findMany = vi.fn().mockResolvedValue([
      { userId: 999, courseId: 1, commentCid: 2, like: true },
    ])
    const handler = (await import('../../server/api/comments/records.get')).default
    const r = await handler(makeEvent({ query: { course_id: '1', cid: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data).toHaveLength(1)
    expect(r.data[0].userId).toBe(100)
    expect(r.data[0].record.comments).toHaveLength(2)
    expect(r.data[0].record.likeCount).toBe(1)
  })
})

// ====================== show.ts ======================

describe('API: comments/show', () => {
  it('缺少参数返回失败', async () => {
    const handler = (await import('../../server/api/comments/show')).default
    const r = await handler(makeEvent({ query: { course_id: '1' } }))
    expect(r.success).toBe(false)
  })

  it('返回单条评论', async () => {
    _mockDb.query.comments.findFirst = vi.fn().mockResolvedValue({ courseId: 1, cid: 1, content: 'hi' })
    const handler = (await import('../../server/api/comments/show')).default
    const r = await handler(makeEvent({ query: { course_id: '1', cid: '1' } }))
    expect(r.success).toBe(true)
    expect(r.data.content).toBe('hi')
  })

  it('不存在返回 null data', async () => {
    _mockDb.query.comments.findFirst = vi.fn().mockResolvedValue(null)
    const handler = (await import('../../server/api/comments/show')).default
    const r = await handler(makeEvent({ query: { course_id: '1', cid: '999' } }))
    expect(r.success).toBe(true)
    expect(r.data).toBeNull()
  })
})

// ====================== update.post.ts ======================

describe('API: comments/update', () => {
  it('非教师被拒', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/comments/update.post')).default
    await expect(handler(makeEvent({ body: { course_id: 1, id: 1, content: 'edit' } }))).rejects.toThrow()
  })

  it('缺少 id 返回失败', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/comments/update.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1 } }))
    expect(r.success).toBe(false)
  })

  it('教师更新评论成功', async () => {
    setMockAuthState({ id: 1, username: 't', name: 't', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/comments/update.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, id: 1, content: 'edited' } }))
    expect(r.success).toBe(true)
  })
})
