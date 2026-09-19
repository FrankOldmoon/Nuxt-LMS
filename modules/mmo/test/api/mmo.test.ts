/**
 * MMO 模块 REST API 端点测试
 * @see modules/mmo/server/api/mmo/*.ts
 *
 * 覆盖端点：
 *  - join.post          发放一次性 token + 计算班级房间号
 *  - state.get          读取调用者存档
 *  - state.post         仅保存 name / cfg（数值字段由权威服务端维护）
 *  - reset.post         删除调用者存档
 *  - instances.get      按班级列出副本（过滤 ext_ 外部副本）
 *  - instances.post     教师 upsert 副本定义（按班级隔离）
 *  - [id].delete        教师删除本班副本（id + classId 双重匹配）
 *  - from-url.post      服务端拉取外部 JSON 并持久化为 ext_ 副本
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// 记录 drizzle-orm 中 eq / and 的实参，用于断言「按 classId 隔离」的查询条件
const { _mockEq, _mockAnd } = vi.hoisted(() => ({
  _mockEq: vi.fn((a: any, b: any) => ({ op: 'eq', a, b })),
  _mockAnd: vi.fn((...args: any[]) => ({ op: 'and', args })),
}))
vi.mock('drizzle-orm', () => ({ eq: _mockEq, and: _mockAnd }))

// ---- Mock @nuxthub/db ----
const _mockDb: any = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  returning: vi.fn(),
}
const _mockSchema: any = {
  users: { id: 'users.id', defaultClass: 'users.defaultClass', classId: 'users.classId' },
  tokens: { name: 'tokens.name', userId: 'tokens.userId' },
  gameInfo: { id: 'gameInfo.id', userId: 'gameInfo.userId', courseId: 'gameInfo.courseId' },
  mmoInstance: { id: 'mmoInstance.id', classId: 'mmoInstance.classId' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

import { resetAllStubs, setMockAuthState } from '../../../../test/setup/nuxt-stubs'

const TEACHER = { id: 7, username: 'teacher', name: 'Teacher', roles: ['teacher'], permissions: [] }
const ADMIN = { id: 1, username: 'admin', name: 'Admin', roles: ['admin'], permissions: [] }
const STUDENT = { id: 9, username: 'stone', name: 'Stone', roles: ['student'], permissions: [] }

function resetChain() {
  _mockDb.select = vi.fn().mockReturnThis()
  _mockDb.from = vi.fn().mockReturnThis()
  _mockDb.where = vi.fn().mockReturnThis()
  _mockDb.limit = vi.fn()
  _mockDb.insert = vi.fn().mockReturnThis()
  _mockDb.values = vi.fn().mockReturnThis()
  _mockDb.update = vi.fn().mockReturnThis()
  _mockDb.set = vi.fn().mockReturnThis()
  _mockDb.delete = vi.fn().mockReturnThis()
  _mockDb.returning = vi.fn()
  _mockEq.mockClear()
  _mockAnd.mockClear()
}

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
  resetChain()
})

/** 构造最小 Nitro event 桩（默认携带课程参数：游戏数据/金币按课程绑定） */
function makeEvent(opts: { query?: any; params?: any; body?: any } = {}) {
  const query = { course: 1, ...(opts.query || {}) }
  const body = opts.body && typeof opts.body === 'object' ? { courseId: 1, ...opts.body } : opts.body
  return { cookies: {}, query, params: opts.params || {}, body } as any
}

/** eq(a, b) 是否被调用过 */
function eqCalledWith(a: any, b: any) {
  return _mockEq.mock.calls.some((c: any[]) => c[0] === a && c[1] === b)
}

// ===================== join.post =====================
describe('API: mmo/join.post', () => {
  const load = async () => (await import('../../server/api/mmo/join.post')).default

  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = await load()
    await expect(handler(makeEvent())).rejects.toThrow()
  })

  it('优先取 default_class.id，发放 mmo: token 并写入 tokens 表', async () => {
    setMockAuthState(TEACHER)
    _mockDb.limit.mockResolvedValue([{ defaultClass: { id: 42 }, classId: 7 }])
    const handler = await load()
    const result = await handler(makeEvent())

    expect(result.success).toBe(true)
    expect(result.data.classId).toBe(42)
    expect(result.data.courseId).toBe(1) // 回显绑定课程
    expect(result.data.token).toMatch(/^mmo:[0-9a-f]{32}$/)
    expect(_mockDb.insert).toHaveBeenCalledWith(_mockSchema.tokens)
    expect(_mockDb.values).toHaveBeenCalledWith({ name: result.data.token, userId: 7 })
    expect(eqCalledWith(_mockSchema.users.id, 7)).toBe(true)
  })

  it('缺少课程参数则失败（不发放 token）', async () => {
    setMockAuthState(TEACHER)
    const handler = await load()
    const result = await handler({ cookies: {}, query: {}, params: {}, body: {} } as any)
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/课程参数/)
    expect(_mockDb.insert).not.toHaveBeenCalled()
  })

  it('无 default_class 时回退 users.class_id', async () => {
    setMockAuthState(TEACHER)
    _mockDb.limit.mockResolvedValue([{ defaultClass: null, classId: 7 }])
    const handler = await load()
    const result = await handler(makeEvent())
    expect(result.data.classId).toBe(7)
  })

  it('default_class 无 id 时回退 users.class_id', async () => {
    setMockAuthState(TEACHER)
    _mockDb.limit.mockResolvedValue([{ defaultClass: {}, classId: 3 }])
    const handler = await load()
    const result = await handler(makeEvent())
    expect(result.data.classId).toBe(3)
  })

  it('两者都没有时 classId 为 0', async () => {
    setMockAuthState(TEACHER)
    _mockDb.limit.mockResolvedValue([{ defaultClass: null, classId: null }])
    const handler = await load()
    const result = await handler(makeEvent())
    expect(result.data.classId).toBe(0)
  })

  it('查不到用户行时 classId 为 0', async () => {
    setMockAuthState(TEACHER)
    _mockDb.limit.mockResolvedValue([])
    const handler = await load()
    const result = await handler(makeEvent())
    expect(result.data.classId).toBe(0)
  })
})

// ===================== state.get =====================
describe('API: mmo/state.get', () => {
  const load = async () => (await import('../../server/api/mmo/state.get')).default

  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = await load()
    await expect(handler(makeEvent())).rejects.toThrow()
  })

  it('返回调用者自己的存档行', async () => {
    setMockAuthState({ ...STUDENT, id: 5 })
    _mockDb.limit.mockResolvedValue([{ id: 1, userId: 5, name: 'hero', gold: 300 }])
    const handler = await load()
    const result = await handler(makeEvent())

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ id: 1, userId: 5, name: 'hero', gold: 300 })
    expect(eqCalledWith(_mockSchema.gameInfo.userId, 5)).toBe(true)
    expect(eqCalledWith(_mockSchema.gameInfo.courseId, 1)).toBe(true)
  })

  it('缺少课程参数返回失败（游戏数据必须绑定课程）', async () => {
    setMockAuthState(STUDENT)
    const handler = await load()
    const result = await handler({ cookies: {}, query: {}, params: {} } as any)
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/课程参数/)
  })

  it('无存档返回 null（不自动创建）', async () => {
    setMockAuthState(STUDENT)
    _mockDb.limit.mockResolvedValue([])
    const handler = await load()
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    expect(result.data).toBeNull()
    expect(_mockDb.insert).not.toHaveBeenCalled()
  })
})

// ===================== state.post =====================
describe('API: mmo/state.post', () => {
  const load = async () => (await import('../../server/api/mmo/state.post')).default

  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = await load()
    await expect(handler(makeEvent({ body: { name: 'x' } }))).rejects.toThrow()
  })

  it('body 非对象返回失败', async () => {
    setMockAuthState(STUDENT)
    const handler = await load()
    const result = await handler(makeEvent({ body: 'not-object' }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/参数格式错误/)
  })

  it('缺失 body 返回失败', async () => {
    setMockAuthState(STUDENT)
    const handler = await load()
    const result = await handler(makeEvent({ body: undefined }))
    expect(result.success).toBe(false)
  })

  it('仅含数值字段时无可保存字段（防作弊）', async () => {
    setMockAuthState(STUDENT)
    const handler = await load()
    const result = await handler(makeEvent({ body: { gold: 9999999, hp: 0, level: 99 } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/没有可保存的字段/)
    expect(_mockDb.update).not.toHaveBeenCalled()
    expect(_mockDb.insert).not.toHaveBeenCalled()
  })

  it('数值字段被忽略，只写入 name', async () => {
    setMockAuthState(STUDENT)
    _mockDb.limit
      .mockResolvedValueOnce([{ id: 1, userId: 9 }])
      .mockResolvedValueOnce([{ id: 1, userId: 9, name: 'hero' }])
    const handler = await load()
    const result = await handler(makeEvent({ body: { name: 'hero', gold: 9999999 } }))

    expect(result.success).toBe(true)
    expect(_mockDb.update).toHaveBeenCalledWith(_mockSchema.gameInfo)
    const patch = _mockDb.set.mock.calls[0][0]
    expect(Object.keys(patch)).toEqual(['name'])
    expect(patch.gold).toBeUndefined()
    expect(_mockDb.insert).not.toHaveBeenCalled()
  })

  it('name 超过 50 字符被截断', async () => {
    setMockAuthState(STUDENT)
    _mockDb.limit
      .mockResolvedValueOnce([{ id: 1, userId: 9 }])
      .mockResolvedValueOnce([{ id: 1, userId: 9, name: 'x' }])
    const handler = await load()
    await handler(makeEvent({ body: { name: 'a'.repeat(60) } }))
    const patch = _mockDb.set.mock.calls[0][0]
    expect(patch.name).toHaveLength(50)
  })

  it('空字符串 name 回退为默认「玩家」', async () => {
    setMockAuthState(STUDENT)
    _mockDb.limit
      .mockResolvedValueOnce([{ id: 1, userId: 9 }])
      .mockResolvedValueOnce([{ id: 1, userId: 9, name: '玩家' }])
    const handler = await load()
    await handler(makeEvent({ body: { name: '' } }))
    expect(_mockDb.set.mock.calls[0][0].name).toBe('玩家')
  })

  it('cfg 对象被原样保存', async () => {
    setMockAuthState(STUDENT)
    const cfg = { body: 1, skin: 'blue', hairColor: '#fff' }
    _mockDb.limit
      .mockResolvedValueOnce([{ id: 1, userId: 9 }])
      .mockResolvedValueOnce([{ id: 1, userId: 9, cfg }])
    const handler = await load()
    const result = await handler(makeEvent({ body: { cfg } }))
    expect(_mockDb.set.mock.calls[0][0].cfg).toEqual(cfg)
    expect(result.data.cfg).toEqual(cfg)
  })

  it('已有存档走 update，不插入', async () => {
    setMockAuthState(STUDENT)
    _mockDb.limit
      .mockResolvedValueOnce([{ id: 1, userId: 9 }])
      .mockResolvedValueOnce([{ id: 1, userId: 9, name: 'hero' }])
    const handler = await load()
    const result = await handler(makeEvent({ body: { name: 'hero' } }))
    expect(_mockDb.update).toHaveBeenCalled()
    expect(_mockDb.insert).not.toHaveBeenCalled()
    expect(result.data).toEqual({ id: 1, userId: 9, name: 'hero' })
  })

  it('首次创建存档时插入并补 mapId=world，昵称取账号名', async () => {
    setMockAuthState({ ...STUDENT, id: 9, name: 'Stone' })
    _mockDb.limit
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 2, userId: 9, name: 'hero', mapId: 'world' }])
    const handler = await load()
    const result = await handler(makeEvent({ body: { name: 'hero' } }))

    expect(_mockDb.insert).toHaveBeenCalledWith(_mockSchema.gameInfo)
    expect(_mockDb.values).toHaveBeenCalledWith(expect.objectContaining({
      userId: 9,
      name: 'hero',
      mapId: 'world',
    }))
    expect(result.data.mapId).toBe('world')
  })
})

// ===================== reset.post =====================
describe('API: mmo/reset.post', () => {
  const load = async () => (await import('../../server/api/mmo/reset.post')).default

  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = await load()
    await expect(handler(makeEvent())).rejects.toThrow()
  })

  it('删除调用者的 game_info 记录并返回 ok', async () => {
    setMockAuthState({ ...STUDENT, id: 5 })
    const handler = await load()
    const result = await handler(makeEvent())

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ ok: true })
    expect(_mockDb.delete).toHaveBeenCalledWith(_mockSchema.gameInfo)
    expect(eqCalledWith(_mockSchema.gameInfo.userId, 5)).toBe(true)
    expect(eqCalledWith(_mockSchema.gameInfo.courseId, 1)).toBe(true)
  })

  it('缺少课程参数返回失败（不会误删其它课程存档）', async () => {
    setMockAuthState(STUDENT)
    const handler = await load()
    const result = await handler({ cookies: {}, query: {}, params: {}, body: {} } as any)
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/课程参数/)
    expect(_mockDb.delete).not.toHaveBeenCalled()
  })
})

// ===================== instances.get =====================
describe('API: mmo/instances.get', () => {
  const load = async () => (await import('../../server/api/mmo/instances.get')).default

  /** 第一次 where（users 取班级）返回链式对象，第二次 where（mmo_instance 列表）直接返回数组 */
  function mockList(userRows: any[], list: any[]) {
    _mockDb.where = vi.fn().mockReturnValueOnce(_mockDb).mockResolvedValueOnce(list)
    _mockDb.limit.mockResolvedValue(userRows)
  }

  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = await load()
    await expect(handler(makeEvent())).rejects.toThrow()
  })

  it('按调用者班级过滤，并解析 json 字符串', async () => {
    setMockAuthState({ ...STUDENT, id: 5 })
    mockList(
      [{ defaultClass: { id: 3 }, classId: 9 }],
      [
        { id: 'dungeon1', name: '副本一', description: 'desc', json: '{"a":1}', createdAt: 't1' },
      ],
    )
    const handler = await load()
    const result = await handler(makeEvent())

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
    expect(result.data[0]).toEqual({
      id: 'dungeon1',
      name: '副本一',
      description: 'desc',
      json: { a: 1 },
      createdAt: 't1',
    })
    expect(eqCalledWith(_mockSchema.mmoInstance.classId, 3)).toBe(true)
  })

  it('过滤 ext_ 前缀的外部副本', async () => {
    setMockAuthState(STUDENT)
    mockList(
      [{ defaultClass: { id: 3 }, classId: 9 }],
      [
        { id: 'dungeon1', name: '副本一', description: null, json: { a: 1 } },
        { id: 'ext_remote', name: '外部', description: null, json: { b: 2 } },
      ],
    )
    const handler = await load()
    const result = await handler(makeEvent())
    expect(result.data).toHaveLength(1)
    expect(result.data[0].id).toBe('dungeon1')
  })

  it('includeExt=1 时一并返回外部副本（供启动预注册）', async () => {
    setMockAuthState(STUDENT)
    mockList(
      [{ defaultClass: { id: 3 }, classId: 9 }],
      [
        { id: 'dungeon1', name: '副本一', description: null, json: { a: 1 } },
        { id: 'ext_remote', name: '外部', description: null, json: { b: 2 } },
      ],
    )
    const handler = await load()
    const result = await handler(makeEvent({ query: { includeExt: '1' } }))
    expect(result.data).toHaveLength(2)
    expect(result.data.map((r: any) => r.id)).toEqual(['dungeon1', 'ext_remote'])
  })

  it('json 已是对象时不再 JSON.parse', async () => {
    setMockAuthState(STUDENT)
    mockList(
      [{ classId: 9 }],
      [{ id: 'd2', name: 'n', description: null, json: { b: 2 }, createdAt: null }],
    )
    const handler = await load()
    const result = await handler(makeEvent())
    expect(result.data[0].json).toEqual({ b: 2 })
  })

  it('班级为空时 classId 回退为 0', async () => {
    setMockAuthState(STUDENT)
    mockList([{}], [])
    const handler = await load()
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    expect(result.data).toEqual([])
    expect(eqCalledWith(_mockSchema.mmoInstance.classId, 0)).toBe(true)
  })
})

// ===================== instances.post =====================
describe('API: mmo/instances.post', () => {
  const load = async () => (await import('../../server/api/mmo/instances.post')).default
  const validJson = { id: 'dungeon1', name: '副本一', map: { file: 'map.json', tex: 'map.png' } }

  function mockUpsert(userRows: any[], existing: any[]) {
    _mockDb.limit
      .mockResolvedValueOnce(userRows)
      .mockResolvedValueOnce(existing)
  }

  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = await load()
    await expect(handler(makeEvent({ body: { json: validJson } }))).rejects.toThrow()
  })

  it('学生角色抛 403', async () => {
    setMockAuthState(STUDENT)
    const handler = await load()
    await expect(handler(makeEvent({ body: { json: validJson } }))).rejects.toMatchObject({ statusCode: 403 })
  })

  it('缺少 body.json 返回失败', async () => {
    setMockAuthState(TEACHER)
    const handler = await load()
    const result = await handler(makeEvent({ body: {} }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/缺少副本定义/)
  })

  it('json.id 缺失返回失败', async () => {
    setMockAuthState(TEACHER)
    const handler = await load()
    const result = await handler(makeEvent({ body: { json: { name: 'x', map: { file: 'a', tex: 'b' } } } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/id 缺失/)
  })

  it('json.id 含非法字符返回失败', async () => {
    setMockAuthState(TEACHER)
    const handler = await load()
    const result = await handler(makeEvent({
      body: { json: { id: 'bad-id!', name: 'x', map: { file: 'a', tex: 'b' } } },
    }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/仅限字母/)
  })

  it('json.name 缺失返回失败', async () => {
    setMockAuthState(TEACHER)
    const handler = await load()
    const result = await handler(makeEvent({
      body: { json: { id: 'd1', map: { file: 'a', tex: 'b' } } },
    }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/名称缺失/)
  })

  it('map.file / map.tex 缺失返回失败', async () => {
    setMockAuthState(TEACHER)
    const handler = await load()
    const result = await handler(makeEvent({ body: { json: { id: 'd1', name: 'x', map: { file: 'a' } } } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/map.file/)
  })

  it('新副本插入时携带 classId / createdBy', async () => {
    setMockAuthState(TEACHER)
    mockUpsert([{ defaultClass: { id: 3 }, classId: 9 }], [])
    const handler = await load()
    const result = await handler(makeEvent({ body: { json: validJson } }))

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ id: 'dungeon1', name: '副本一' })
    expect(_mockDb.insert).toHaveBeenCalledWith(_mockSchema.mmoInstance)
    expect(_mockDb.values).toHaveBeenCalledWith(expect.objectContaining({
      id: 'dungeon1',
      classId: 3,
      name: '副本一',
      description: null,
      createdBy: 7,
      json: validJson,
    }))
    expect(_mockDb.update).not.toHaveBeenCalled()
    expect(eqCalledWith(_mockSchema.mmoInstance.id, 'dungeon1')).toBe(true)
  })

  it('已存在同名副本走 update（where 带 id + classId），不插入', async () => {
    setMockAuthState(TEACHER)
    mockUpsert([{ classId: 9 }], [{ id: 'dungeon1', classId: 9 }])
    const handler = await load()
    const result = await handler(makeEvent({ body: { json: validJson } }))

    expect(result.success).toBe(true)
    expect(_mockDb.update).toHaveBeenCalledWith(_mockSchema.mmoInstance)
    expect(_mockDb.set).toHaveBeenCalledWith(expect.objectContaining({ id: 'dungeon1', classId: 9 }))
    expect(_mockDb.insert).not.toHaveBeenCalled()
    expect(_mockAnd).toHaveBeenCalled() // update 同时按 id + classId 限定
  })

  it('同名副本属于其它班级时友好失败，不覆盖/不插入', async () => {
    setMockAuthState(TEACHER) // 教师班级由 default_class 推导为 3
    mockUpsert([{ defaultClass: { id: 3 } }], [{ id: 'dungeon1', classId: 5 }])
    const handler = await load()
    const result = await handler(makeEvent({ body: { json: validJson } }))

    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/其它班级/)
    expect(_mockDb.update).not.toHaveBeenCalled()
    expect(_mockDb.insert).not.toHaveBeenCalled()
  })

  it('name / description 超长被截断', async () => {
    setMockAuthState(ADMIN)
    mockUpsert([{ defaultClass: { id: 3 } }], [])
    const handler = await load()
    await handler(makeEvent({
      body: { json: { id: 'd1', name: 'n'.repeat(200), description: 'd'.repeat(600), map: { file: 'a', tex: 'b' } } },
    }))
    const data = _mockDb.values.mock.calls[0][0]
    expect(data.name).toHaveLength(120)
    expect(data.description).toHaveLength(500)
  })
})

// ===================== instances/[id].delete =====================
describe('API: mmo/instances/[id].delete', () => {
  const load = async () => (await import('../../server/api/mmo/instances/[id].delete')).default

  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = await load()
    await expect(handler(makeEvent({ params: { id: 'd1' } }))).rejects.toThrow()
  })

  it('学生角色抛 403', async () => {
    setMockAuthState(STUDENT)
    const handler = await load()
    await expect(handler(makeEvent({ params: { id: 'd1' } }))).rejects.toMatchObject({ statusCode: 403 })
  })

  it('缺少 id 返回失败', async () => {
    setMockAuthState(TEACHER)
    const handler = await load()
    const result = await handler(makeEvent({ params: {} }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/缺少副本 id/)
    expect(_mockDb.delete).not.toHaveBeenCalled()
  })

  it('以 id + classId 双重条件删除本班副本', async () => {
    setMockAuthState({ ...TEACHER, id: 7 })
    _mockDb.limit.mockResolvedValue([{ defaultClass: { id: 3 }, classId: 9 }])
    const handler = await load()
    const result = await handler(makeEvent({ params: { id: 'dungeon1' } }))

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ ok: true })
    expect(_mockDb.delete).toHaveBeenCalledWith(_mockSchema.mmoInstance)
    expect(_mockAnd).toHaveBeenCalled()
    expect(eqCalledWith(_mockSchema.mmoInstance.id, 'dungeon1')).toBe(true)
    expect(eqCalledWith(_mockSchema.mmoInstance.classId, 3)).toBe(true)
  })

  it('无班级时以 classId=0 删除', async () => {
    setMockAuthState(TEACHER)
    _mockDb.limit.mockResolvedValue([{}])
    const handler = await load()
    await handler(makeEvent({ params: { id: 'd1' } }))
    expect(eqCalledWith(_mockSchema.mmoInstance.classId, 0)).toBe(true)
  })
})

// ===================== instances/from-url.post =====================
describe('API: mmo/instances/from-url.post', () => {
  const load = async () => (await import('../../server/api/mmo/instances/from-url.post')).default
  const _origFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = _origFetch
  })

  /** 让服务端 fetch 返回指定 JSON */
  function mockFetchJson(json: any, ok = true, status = 200) {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok,
      status,
      json: vi.fn().mockResolvedValue(json),
    }) as any
  }

  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = await load()
    await expect(handler(makeEvent({ body: { url: 'https://x/y.json' } }))).rejects.toThrow()
  })

  it('缺失/非 http 链接返回失败', async () => {
    setMockAuthState(STUDENT)
    const handler = await load()
    const missing = await handler(makeEvent({ body: {} }))
    expect(missing.success).toBe(false)
    expect(missing.msg).toMatch(/非法的 json 链接/)
    const bad = await handler(makeEvent({ body: { url: 'javascript:alert(1)' } }))
    expect(bad.success).toBe(false)
  })

  it('下载返回非 2xx 时失败', async () => {
    setMockAuthState(STUDENT)
    mockFetchJson(null, false, 404)
    const handler = await load()
    const result = await handler(makeEvent({ body: { url: 'https://x/y.json' } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/HTTP 404/)
  })

  it('fetch 抛错时返回失败', async () => {
    setMockAuthState(STUDENT)
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('boom')) as any
    const handler = await load()
    const result = await handler(makeEvent({ body: { url: 'https://x/y.json' } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/boom/)
  })

  it('json 内容非对象返回失败', async () => {
    setMockAuthState(STUDENT)
    mockFetchJson('not-an-object')
    const handler = await load()
    const result = await handler(makeEvent({ body: { url: 'https://x/y.json' } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/内容非法/)
  })

  it('缺少 map.file / map.tex 返回失败', async () => {
    setMockAuthState(STUDENT)
    mockFetchJson({ id: 'd1', name: 'x', map: { file: 'a' } })
    const handler = await load()
    const result = await handler(makeEvent({ body: { url: 'https://x/y.json' } }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/map.file/)
  })

  it('成功持久化为 ext_ 前缀副本并带上 classId', async () => {
    setMockAuthState({ ...STUDENT, id: 5 })
    mockFetchJson({ id: 'dungeon1', name: '外部副本', description: 'd', map: { file: 'a', tex: 'b' } })
    _mockDb.limit
      .mockResolvedValueOnce([{ defaultClass: { id: 3 }, classId: 9 }])
      .mockResolvedValueOnce([])
    const handler = await load()
    const result = await handler(makeEvent({ body: { url: 'https://x/y.json' } }))

    expect(result.success).toBe(true)
    expect(result.data.id).toBe('ext_dungeon1')
    expect(result.data.name).toBe('外部副本')
    expect(result.data.json).toMatchObject({ map: { file: 'a', tex: 'b' } })
    expect(_mockDb.insert).toHaveBeenCalledWith(_mockSchema.mmoInstance)
    expect(_mockDb.values).toHaveBeenCalledWith(expect.objectContaining({
      id: 'ext_dungeon1',
      classId: 3,
      name: '外部副本',
      createdBy: 5,
    }))
  })

  it('缺少 json.id 时由 url 派生稳定 id，且 name 缺省为「外部副本」', async () => {
    setMockAuthState(STUDENT)
    mockFetchJson({ map: { file: 'a', tex: 'b' } })
    _mockDb.limit
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([])
    const handler = await load()
    const result = await handler(makeEvent({ body: { url: 'https://example.com/path/scene.json' } }))

    expect(result.success).toBe(true)
    expect(result.data.id).toMatch(/^ext_[a-zA-Z0-9_]{1,40}$/)
    expect(result.data.name).toBe('外部副本')
    expect(_mockDb.values.mock.calls[0][0].name).toBe('外部副本')
  })

  it('已存在相同 ext_ id 时走 update，不插入', async () => {
    setMockAuthState(STUDENT)
    mockFetchJson({ id: 'dungeon1', name: 'x', map: { file: 'a', tex: 'b' } })
    _mockDb.limit
      .mockResolvedValueOnce([{ classId: 9 }])
      .mockResolvedValueOnce([{ id: 'ext_dungeon1' }])
    const handler = await load()
    const result = await handler(makeEvent({ body: { url: 'https://x/y.json' } }))

    expect(result.success).toBe(true)
    expect(_mockDb.update).toHaveBeenCalledWith(_mockSchema.mmoInstance)
    expect(_mockDb.insert).not.toHaveBeenCalled()
  })
})
