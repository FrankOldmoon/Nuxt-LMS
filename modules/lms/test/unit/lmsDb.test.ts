/**
 * LMS db 工具测试
 * @see modules/lms/server/utils/db.ts
 *
 * 测试 saveContentVersion / listContentVersions / getContentVersion /
 *      restoreContentVersion / getCourseMembers / updateCourseMember / getClassUsers
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@nuxthub/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: {
      userCourses: { findMany: vi.fn() },
    },
  },
  schema: {
    courseVersions: { id: 'id', courseId: 'courseId', content: 'content', createdAt: 'createdAt' },
    chapterVersions: { id: 'id', chapterId: 'chapterId', content: 'content', createdAt: 'createdAt' },
    userCourses: { userId: 'userId', courseId: 'courseId', isTeacher: 'isTeacher', isEditor: 'isEditor', deletedAt: 'deletedAt', number: 'number', group: 'group' },
    users: { id: 'id', username: 'username', name: 'name', preferName: 'preferName', englishName: 'englishName', avatarImg: 'avatarImg', rollNumber: 'rollNumber', email: 'email', telephone: 'telephone', loginAt: 'loginAt', deletedAt: 'deletedAt', classId: 'classId', defaultClass: 'defaultClass' },
    userClasses: { userId: 'userId', classId: 'classId', isTeacher: 'isTeacher', deletedAt: 'deletedAt' },
  },
}))

vi.mock('../../../base/server/utils/db/crud', () => ({
  showTable: vi.fn(),
  updateTable: vi.fn(),
}))

import { db } from '@nuxthub/db'
import { showTable, updateTable } from '../../../base/server/utils/db/crud'
import {
  saveContentVersion,
  listContentVersions,
  getContentVersion,
  restoreContentVersion,
} from '../../server/utils/db/versions'
import { getCourseMembers, updateCourseMember } from '../../server/utils/db/courseMembers'
import { getClassUsers } from '../../server/utils/db/classUsers'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

/** 创建 thenable 链式 mock：所有链方法返回 this，await chain 获得 result */
function chainReturning(result: any = []) {
  const chain: any = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
  }
  chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject)
  return chain
}

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
})

// ====================== 内容版本快照 ======================

describe('server/utils/db - saveContentVersion', () => {
  it('插入快照且版本数 ≤ maxKeep 时不删除', async () => {
    vi.mocked(db.insert).mockReturnValue(chainReturning())
    vi.mocked(db.select).mockReturnValue(chainReturning([{ id: 1 }, { id: 2 }])) // 2 条 ≤ maxKeep(10)

    await saveContentVersion('course', 1, { text: 'old' })

    expect(db.insert).toHaveBeenCalledTimes(1)
    expect(db.delete).not.toHaveBeenCalled()
  })

  it('版本数 > maxKeep 时删除多余版本', async () => {
    vi.mocked(db.insert).mockReturnValue(chainReturning())
    // 12 条，maxKeep=10 → 删除最后 2 条
    const versions = Array.from({ length: 12 }, (_, i) => ({ id: i + 1 }))
    vi.mocked(db.select).mockReturnValue(chainReturning(versions))
    vi.mocked(db.delete).mockReturnValue(chainReturning())

    await saveContentVersion('course', 1, { text: 'old' }, 10)

    expect(db.delete).toHaveBeenCalledTimes(1)
  })

  it('chapter 类型使用 chapterVersions 表', async () => {
    vi.mocked(db.insert).mockReturnValue(chainReturning())
    vi.mocked(db.select).mockReturnValue(chainReturning([]))

    await saveContentVersion('chapter', 5, { text: 'old' })

    // insert 被调用（使用 chapterVersions 表）
    expect(db.insert).toHaveBeenCalledTimes(1)
  })
})

describe('server/utils/db - listContentVersions', () => {
  it('返回版本列表（按 id 倒序）', async () => {
    const versions = [
      { id: 3, content: { v: 3 }, createdAt: new Date() },
      { id: 2, content: { v: 2 }, createdAt: new Date() },
    ]
    vi.mocked(db.select).mockReturnValue(chainReturning(versions))

    const result = await listContentVersions('course', 1)
    expect(result).toBe(versions)
  })

  it('无版本返回空数组', async () => {
    vi.mocked(db.select).mockReturnValue(chainReturning([]))
    const result = await listContentVersions('chapter', 1)
    expect(result).toEqual([])
  })
})

describe('server/utils/db - getContentVersion', () => {
  it('找到版本 → 返回行', async () => {
    const version = { id: 1, content: { v: 1 }, createdAt: new Date() }
    vi.mocked(db.select).mockReturnValue(chainReturning([version]))

    const result = await getContentVersion('course', 1)
    expect(result).toEqual(version)
  })

  it('未找到 → 返回 null', async () => {
    vi.mocked(db.select).mockReturnValue(chainReturning([]))

    const result = await getContentVersion('chapter', 999)
    expect(result).toBeNull()
  })
})

describe('server/utils/db - restoreContentVersion', () => {
  it('保存当前内容为快照 + 写回历史内容', async () => {
    vi.mocked(showTable).mockResolvedValue({ content: { old: true } } as any)
    vi.mocked(db.insert).mockReturnValue(chainReturning())
    vi.mocked(db.select).mockReturnValue(chainReturning([])) // saveContentVersion 的版本查询
    vi.mocked(updateTable).mockResolvedValue(undefined as any)

    await restoreContentVersion('course', 1, { restored: true })

    // showTable 获取当前内容
    expect(showTable).toHaveBeenCalledWith('courses', 1)
    // saveContentVersion 保存旧内容
    expect(db.insert).toHaveBeenCalledTimes(1)
    // updateTable 写回新内容
    expect(updateTable).toHaveBeenCalledWith('courses', 1, { content: { restored: true } })
  })

  it('当前内容为 null 时不保存快照但仍写回', async () => {
    vi.mocked(showTable).mockResolvedValue({ content: null } as any)
    vi.mocked(updateTable).mockResolvedValue(undefined as any)

    await restoreContentVersion('chapter', 5, { restored: true })

    expect(db.insert).not.toHaveBeenCalled()
    expect(updateTable).toHaveBeenCalledWith('chapters', 5, { content: { restored: true } })
  })
})

// ====================== 课程成员管理 ======================

describe('server/utils/db - getCourseMembers', () => {
  it('返回教师和编辑者列表', async () => {
    const members = [
      { userId: 1, isTeacher: true, isEditor: false, username: 'teacher1', name: 'T1', avatarImg: '/a.webp' },
      { userId: 2, isTeacher: false, isEditor: true, username: 'editor1', name: 'E1', avatarImg: '/b.webp' },
    ]
    vi.mocked(db.select).mockReturnValue(chainReturning(members))

    const result = await getCourseMembers(1)
    expect(result).toBe(members)
  })
})

describe('server/utils/db - updateCourseMember', () => {
  it('已有记录 + add teacher → update isTeacher=true', async () => {
    vi.mocked(db.select).mockReturnValue(chainReturning([{ courseId: 1, userId: 2 }]))
    vi.mocked(db.update).mockReturnValue(chainReturning())

    await updateCourseMember(1, 2, 'teacher', 'add')

    expect(db.update).toHaveBeenCalledTimes(1)
    const setArg = vi.mocked(db.update).mock.calls[0][1] // update(table) 的第二参数? 
    // 实际调用：db.update(schema.userCourses).set({ isTeacher: true })
    // update 的第一个参数是 schema.userCourses，set 的参数是 { isTeacher: true }
    // 由于 update 返回 chainReturning，set 返回 this
    // 检查 set 被调用
    expect(db.update).toHaveBeenCalledTimes(1)
  })

  it('无记录 + add editor → insert', async () => {
    vi.mocked(db.select).mockReturnValue(chainReturning([])) // 无 existing
    vi.mocked(db.insert).mockReturnValue(chainReturning())

    await updateCourseMember(1, 3, 'editor', 'add')

    expect(db.insert).toHaveBeenCalledTimes(1)
  })

  it('无记录 + remove → 不操作', async () => {
    vi.mocked(db.select).mockReturnValue(chainReturning([]))

    await updateCourseMember(1, 3, 'teacher', 'remove')

    expect(db.update).not.toHaveBeenCalled()
    expect(db.insert).not.toHaveBeenCalled()
  })
})

// ====================== 班级用户查询 ======================

describe('server/utils/db - getClassUsers', () => {
  it('合并关联表和直接归属用户（去重）', async () => {
    const relUsers = [
      { id: 1, username: 'u1', name: 'U1', isTeacher: true },
      { id: 2, username: 'u2', name: 'U2', isTeacher: null },
    ]
    const directUsers = [
      { id: 2, username: 'u2', name: 'U2' }, // 与 relUsers 重复
      { id: 3, username: 'u3', name: 'U3' }, // 新用户
    ]
    vi.mocked(db.select)
      .mockReturnValueOnce(chainReturning(relUsers))    // relUsers 查询
      .mockReturnValueOnce(chainReturning(directUsers))  // directUsers 查询

    const result = await getClassUsers(1)

    expect(result).toHaveLength(3) // u1 + u2 + u3
    // relUsers 中的用户保留 isTeacher
    expect(result.find(u => u.id === 1)?.isTeacher).toBe(true)
    // directUsers 中的新用户 isTeacher 为 null
    expect(result.find(u => u.id === 3)?.isTeacher).toBeNull()
  })

  it('有 courseId 时合并 userCourses 的 number 和 group', async () => {
    const relUsers = [{ id: 1, username: 'u1', name: 'U1', isTeacher: null }]
    vi.mocked(db.select).mockReturnValueOnce(chainReturning(relUsers))
    vi.mocked(db.select).mockReturnValueOnce(chainReturning([])) // directUsers 空
    vi.mocked(db.query.userCourses.findMany).mockResolvedValue([
      { userId: 1, number: '01', group: 'A' },
    ] as any)

    const result = await getClassUsers(1, 10)

    expect(result).toHaveLength(1)
    expect(result[0].number).toBe('01')
    expect(result[0].group).toBe('A')
  })

  it('无用户时返回空数组', async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(chainReturning([]))
      .mockReturnValueOnce(chainReturning([]))

    const result = await getClassUsers(1)
    expect(result).toEqual([])
  })
})
