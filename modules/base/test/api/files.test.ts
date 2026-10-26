/**
 * Files API 端点测试
 * @see modules/base/server/api/files/*.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const _mockDb = {
  query: {
    files: { findFirst: vi.fn() },
    userCourses: { findMany: vi.fn() },
  },
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  offset: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
}
const _mockSchema = {
  files: {
    id: 'id', name: 'name', hash: 'hash', path: 'path', type: 'type',
    size: 'size', userId: 'userId', group: 'group', deletedAt: 'deletedAt',
  },
  users: { id: 'id', username: 'username' },
  userCourses: { userId: 'userId', courseId: 'courseId', group: 'group' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

// h3: download/serve 显式 import sendStream/setResponseHeader/createError
vi.mock('h3', () => ({
  sendStream: async (_e: any, s: any) => s,
  setResponseHeader: vi.fn(() => {}),
  setResponseStatus: vi.fn(() => {}),
  // 从 event.headers 读取（测试里用 event.headers.range 模拟 Range 请求头）
  getRequestHeader: vi.fn((e: any, name: string) => {
    const headers = e?.headers || {}
    return headers[String(name).toLowerCase()] ?? headers[name]
  }),
  createError: (opts: any) => {
    const err = new Error(opts.message || opts.statusMessage || 'Error')
    ;(err as any).statusCode = opts.statusCode ?? 500
    ;(err as any).statusMessage = opts.statusMessage
    return err
  },
}))

// fs: download/serve 用 createReadStream + access；保留 promises.readFile 给静态分析
vi.mock('fs', async (importActual) => {
  const actual = await importActual<typeof import('fs')>()
  return {
    ...actual,
    access: vi.fn((_path: any, cb: any) => cb(null)),
    createReadStream: vi.fn(() => 'mock-stream' as any),
    statSync: vi.fn(() => ({ size: 1024 }) as any),
  }
})

// upload utils: 控制来源解析、校验、落盘
vi.mock('../../server/utils/upload/parse', () => ({
  UploadError: class UploadError extends Error {
    code: string = 'generic'
    extra: any = {}
    constructor(msg: string, code?: string, extra?: any) {
      super(msg)
      this.code = code || 'generic'
      this.extra = extra || {}
    }
  },
  resolveUploadSource: vi.fn(),
}))
vi.mock('../../server/utils/upload/validate', () => ({
  validateUpload: vi.fn(),
  buildDedupWhere: vi.fn(() => 'mock-where'),
  isSvgContent: vi.fn(() => true),
  sanitizeSvg: vi.fn((b: any) => b),
}))
vi.mock('../../server/utils/upload/persist', () => ({
  sha256Hex: vi.fn(() => 'mock-hash'),
  persistUploadedFile: vi.fn(),
  storedFileExists: vi.fn(),
}))

// 头像访问守卫：默认「不是头像」→ 不影响既有公开只读用例；头像用例单独开启
vi.mock('../../server/utils/files/avatarGuard', () => ({
  AVATAR_VIEWER_ROLES: ['admin', 'teacher', 'observer'],
  guardAvatarAccess: vi.fn(async () => false),
  isAvatarPath: vi.fn(async () => false),
  invalidateAvatarCache: vi.fn(),
}))

// 图片水印：默认不产出水印（回退原文件流），避免单测依赖真实图片解码；
// 需要验证「是否走水印分支」的用例单独断言调用参数
vi.mock('../../server/utils/files/watermark', () => ({
  WATERMARK_EXTS: new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff']),
  isWatermarkableImage: (ext: string) => new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff']).has(String(ext || '').toLowerCase()),
  applyWatermark: vi.fn(async () => null),
  clearWatermarkCache: vi.fn(),
}))

import { resetAllStubs, setMockAuthState, setMockDriveSpace, setMockDriveQuota, setMockDriveUsed } from '../../../../test/setup/nuxt-stubs'
import { access, statSync } from 'fs'
import { resolveUploadSource, UploadError } from '../../server/utils/upload/parse'
import { validateUpload } from '../../server/utils/upload/validate'
import { persistUploadedFile, storedFileExists } from '../../server/utils/upload/persist'
import { guardAvatarAccess } from '../../server/utils/files/avatarGuard'
import { applyWatermark } from '../../server/utils/files/watermark'

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
  // 默认：查重命中的记录物理文件仍在（僵尸记录场景由用例单独关闭）
  vi.mocked(storedFileExists).mockResolvedValue(true)
})

function makeEvent(body: any = undefined, query: any = {}) {
  return { cookies: {}, body, query } as any
}

function resetChain() {
  _mockDb.select = vi.fn().mockReturnThis()
  _mockDb.from = vi.fn().mockReturnThis()
  _mockDb.where = vi.fn().mockReturnThis()
  _mockDb.orderBy = vi.fn().mockReturnThis()
  _mockDb.limit = vi.fn().mockReturnThis()
  _mockDb.offset = vi.fn().mockReturnThis()
  _mockDb.insert = vi.fn().mockReturnThis()
  _mockDb.values = vi.fn().mockReturnThis()
  _mockDb.update = vi.fn().mockReturnThis()
  _mockDb.set = vi.fn().mockReturnThis()
  _mockDb.delete = vi.fn().mockReturnThis()
  _mockDb.query.files.findFirst = vi.fn()
  // 重置 upload util mock
  vi.mocked(resolveUploadSource).mockReset()
  vi.mocked(validateUpload).mockReset()
  vi.mocked(persistUploadedFile).mockReset()
  // 重置 fs.access 默认行为（文件存在）
  vi.mocked(access).mockImplementation(((_p: any, cb: any) => cb(null)) as any)
  // 重置 fs.statSync 默认行为（文件大小 1024）
  vi.mocked(statSync).mockImplementation((() => ({ size: 1024 })) as any)
  // 头像守卫默认「不是头像」（不改变既有公开只读行为）
  vi.mocked(guardAvatarAccess).mockResolvedValue(false)
  // 水印默认不产出（回退原文件流）
  vi.mocked(applyWatermark).mockResolvedValue(null)
}

describe('API: files/delete.post (soft delete)', () => {
  beforeEach(resetChain)

  it('未登录返回 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/files/delete.post')).default
    await expect(handler(makeEvent({ id: 1 }))).rejects.toThrow()
  })

  it('缺少 id 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/files/delete.post')).default
    const result = await handler(makeEvent({}))
    expect(result.success).toBe(false)
  })

  it('文件不存在返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue(null as any)
    const handler = (await import('../../server/api/files/delete.post')).default
    const result = await handler(makeEvent({ id: 999 }))
    expect(result.success).toBe(false)
  })

  it('个人文件：他用户不能删', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({
      id: 1, userId: 2, group: null, path: '/a/b.png',
    } as any)
    const handler = (await import('../../server/api/files/delete.post')).default
    const result = await handler(makeEvent({ id: 1 }))
    expect(result.success).toBe(false)
  })

  it('个人文件：所有者可删（软删除）', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({
      id: 1, userId: 1, group: null, path: '/a/b.png',
    } as any)
    const handler = (await import('../../server/api/files/delete.post')).default
    const result = await handler(makeEvent({ id: 1 }))
    expect(result.success).toBe(true)
    expect(result.data.id).toBe(1)
    // 软删除：调用 update.set({deletedAt: ...})，不调用 fs.rm
    expect(db.update).toHaveBeenCalled()
    expect(db.delete).not.toHaveBeenCalled()
  })

  it('小组文件：非组内成员不可删', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({
      id: 2, userId: 99, group: '1_team-a', path: '/team/file.png',
    } as any)
    vi.mocked(db.query.userCourses.findMany).mockResolvedValue([] as any)
    const handler = (await import('../../server/api/files/delete.post')).default
    const result = await handler(makeEvent({ id: 2 }))
    expect(result.success).toBe(false)
  })

  it('小组文件：组内成员可删', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({
      id: 2, userId: 99, group: '1_team-a', path: '/team/file.png',
    } as any)
    vi.mocked(db.query.userCourses.findMany).mockResolvedValue([{ group: 'team-a' }] as any)
    const handler = (await import('../../server/api/files/delete.post')).default
    const result = await handler(makeEvent({ id: 2 }))
    expect(result.success).toBe(true)
  })

  it('软删除：源代码不再 import node:fs/promises.rm（已不再删除物理文件）', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({
      id: 1, userId: 1, group: null, path: '/a/b.png',
    } as any)
    // 静态校验：源码不应再 import node:fs/promises（软删除不删物理文件）
    const source = await import('node:fs').then(fs =>
      fs.promises.readFile('/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/modules/base/server/api/files/delete.post.ts', 'utf8')
    )
    expect(source).not.toMatch(/from\s+['"]node:fs\/promises['"]/)
    expect(source).not.toMatch(/\brm\s*\(/) // 不应有 rm() 调用
    const handler = (await import('../../server/api/files/delete.post')).default
    const result = await handler(makeEvent({ id: 1 }))
    expect(result.success).toBe(true)
  })
})

describe('API: files/upload.post — 软删除后重新上传', () => {
  it('查重 WHERE 子句包含 isNull(deletedAt)（源代码静态校验）', async () => {
    const text = await (await import('node:fs')).promises.readFile(
      '/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/modules/base/server/utils/upload/validate.ts',
      'utf8'
    )
    // dedup 查重（主流程 + catch 分支）必须过滤 deletedAt
    const matches = text.match(/isNull\(schema\.files\.deletedAt\)/g) || []
    expect(matches.length).toBeGreaterThanOrEqual(2)
  })

  it('buildDedupWhere 同时覆盖主查重与 catch 冲突查重', async () => {
    const text = await (await import('node:fs')).promises.readFile(
      '/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/modules/base/server/utils/upload/validate.ts',
      'utf8'
    )
    // buildDedupWhere 必须在 group 与非 group 两个分支都包含 isNull(deletedAt)
    expect(text).toMatch(/and\(eq\(schema\.files\.hash, hash\), eq\(schema\.files\.group, group\), isNull\(schema\.files\.deletedAt\)\)/)
    expect(text).toMatch(/and\(eq\(schema\.files\.hash, hash\), isNull\(schema\.files\.group\), isNull\(schema\.files\.deletedAt\)\)/)
  })
})

// ====================== upload.post 功能测试 ======================

describe('API: files/upload.post (functional)', () => {
  beforeEach(resetChain)

  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/files/upload.post')).default
    await expect(handler(makeEvent({}))).rejects.toThrow()
  })

  it('来源解析失败（empty）返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    vi.mocked(resolveUploadSource).mockRejectedValue(new UploadError('请上传文件', 'empty'))
    const handler = (await import('../../server/api/files/upload.post')).default
    const result = await handler(makeEvent({}))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/请上传/)
  })

  it('来源解析失败（远程图片）返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    vi.mocked(resolveUploadSource).mockRejectedValue(new Error('timeout'))
    const handler = (await import('../../server/api/files/upload.post')).default
    const result = await handler(makeEvent({ url: 'http://x/y.png' }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/远程图片获取失败/)
  })

  it('校验失败（大小/类型）返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    vi.mocked(resolveUploadSource).mockResolvedValue({
      buffer: Buffer.from('x'), originalName: 'bad.exe', ext: '.exe', fileType: 'application/x-msdownload', group: '',
    })
    vi.mocked(validateUpload).mockImplementation(() => {
      throw new UploadError('不允许上传该类型文件', 'type')
    })
    const handler = (await import('../../server/api/files/upload.post')).default
    const result = await handler(makeEvent({}))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/不允许/)
  })

  it('网盘空间不足返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    vi.mocked(resolveUploadSource).mockResolvedValue({
      buffer: Buffer.from('x'), originalName: 'ok.png', ext: '.png', fileType: 'image/png', group: '',
    })
    vi.mocked(validateUpload).mockImplementation(() => {})
    setMockDriveSpace({ ok: false, quota: 1024, used: 1000 })
    const handler = (await import('../../server/api/files/upload.post')).default
    const result = await handler(makeEvent({}))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/空间不足/)
    expect(result.data.need).toBe(1)
  })

  it('查重命中已存在文件返回已有 URL', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    vi.mocked(resolveUploadSource).mockResolvedValue({
      buffer: Buffer.from('x'), originalName: 'ok.png', ext: '.png', fileType: 'image/png', group: '',
    })
    vi.mocked(validateUpload).mockImplementation(() => {})
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({ id: 99, path: '/dir/99.png' } as any)
    const handler = (await import('../../server/api/files/upload.post')).default
    const result = await handler(makeEvent({}))
    expect(result.success).toBe(true)
    expect(result.msg).toMatch(/已存在/)
    expect(result.data.url).toContain('/api/files/serve?pathname=')
  })

  it('查重命中但物理文件丢失：软删旧记录并重新落盘', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    vi.mocked(resolveUploadSource).mockResolvedValue({
      buffer: Buffer.from('x'), originalName: 'gone.pdf', ext: '.pdf', fileType: 'application/pdf', group: '',
    })
    vi.mocked(validateUpload).mockImplementation(() => {})
    vi.mocked(storedFileExists).mockResolvedValue(false)
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({ id: 99, path: '/250/gone.pdf' } as any)
    vi.mocked(persistUploadedFile).mockResolvedValue({ id: 100, finalDbPath: '/298/new.pdf' })
    const handler = (await import('../../server/api/files/upload.post')).default
    const result = await handler(makeEvent({}))
    expect(result.success).toBe(true)
    expect(result.msg).toMatch(/上传成功/)
    expect(result.data.url).toContain('298')
    expect(vi.mocked(persistUploadedFile)).toHaveBeenCalled()
    expect(vi.mocked(db.update)).toHaveBeenCalled()
  })

  it('成功上传新文件', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    vi.mocked(resolveUploadSource).mockResolvedValue({
      buffer: Buffer.from('hello'), originalName: 'new.png', ext: '.png', fileType: 'image/png', group: '',
    })
    vi.mocked(validateUpload).mockImplementation(() => {})
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue(null as any)
    vi.mocked(persistUploadedFile).mockResolvedValue({ id: 42, finalDbPath: '/dir/42.png' })
    const handler = (await import('../../server/api/files/upload.post')).default
    const result = await handler(makeEvent({}))
    expect(result.success).toBe(true)
    expect(result.msg).toMatch(/上传成功/)
    expect(result.data.id).toBe(42)
    expect(result.data.url).toContain('/api/files/serve?pathname=')
    expect(vi.mocked(persistUploadedFile)).toHaveBeenCalledWith(expect.objectContaining({ userId: 1 }))
  })

  it('persist 抛错且 catch 查重命中则返回已有 URL', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    vi.mocked(resolveUploadSource).mockResolvedValue({
      buffer: Buffer.from('hello'), originalName: 'dup.png', ext: '.png', fileType: 'image/png', group: '',
    })
    vi.mocked(validateUpload).mockImplementation(() => {})
    const { db } = await import('@nuxthub/db')
    // 第一次 findFirst（主查重）返回 null，第二次（catch 冲突）返回已有文件
    vi.mocked(db.query.files.findFirst)
      .mockResolvedValueOnce(null as any)
      .mockResolvedValueOnce({ id: 77, path: '/dir/77.png' } as any)
    vi.mocked(persistUploadedFile).mockRejectedValue(new Error('unique constraint'))
    const handler = (await import('../../server/api/files/upload.post')).default
    const result = await handler(makeEvent({}))
    expect(result.success).toBe(true)
    expect(result.msg).toMatch(/已存在/)
    expect(result.data.url).toContain('/api/files/serve?pathname=')
  })
})

// ====================== download.get ======================

describe('API: files/download.get', () => {
  beforeEach(resetChain)

  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/files/download.get')).default
    await expect(handler(makeEvent(undefined, { id: '1' }))).rejects.toThrow()
  })

  it('缺少 id 抛 400', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/files/download.get')).default
    await expect(handler(makeEvent(undefined, {}))).rejects.toThrow()
  })

  it('文件不存在抛 404', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue(null as any)
    const handler = (await import('../../server/api/files/download.get')).default
    await expect(handler(makeEvent(undefined, { id: '999' }))).rejects.toThrow()
  })

  it('路径穿越攻击抛 403', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({
      id: 1, name: 'evil.png', path: '../../../etc/passwd', userId: 1,
    } as any)
    const handler = (await import('../../server/api/files/download.get')).default
    await expect(handler(makeEvent(undefined, { id: '1' }))).rejects.toThrow()
  })

  it('文件在磁盘不存在抛 404', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({
      id: 1, name: 'gone.png', path: '/dir/1.png', userId: 1,
    } as any)
    vi.mocked(access).mockImplementation(((_p: any, cb: any) => cb(new Error('ENOENT'))) as any)
    const handler = (await import('../../server/api/files/download.get')).default
    await expect(handler(makeEvent(undefined, { id: '1' }))).rejects.toThrow()
  })

  it('成功下载返回 stream', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({
      id: 1, name: 'ok.png', path: '/dir/1.png', userId: 1,
    } as any)
    const handler = (await import('../../server/api/files/download.get')).default
    const result = await handler(makeEvent(undefined, { id: '1' }))
    expect(result).toBe('mock-stream')
  })
})

// ====================== serve.get ======================

describe('API: files/serve.get', () => {
  beforeEach(resetChain)

  it('未登录也可成功读取文件', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/files/serve.get')).default
    const result = await handler(makeEvent(undefined, { pathname: 'dir/1.png' }))
    expect(result).toBe('mock-stream')
  })

  it('缺少 pathname 抛 400', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/files/serve.get')).default
    await expect(handler(makeEvent(undefined, {}))).rejects.toThrow()
  })

  it('路径穿越攻击抛 403', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/files/serve.get')).default
    await expect(handler(makeEvent(undefined, { pathname: '../../../etc/passwd' }))).rejects.toThrow()
  })

  it('文件不存在抛 404', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    vi.mocked(access).mockImplementation(((_p: any, cb: any) => cb(new Error('ENOENT'))) as any)
    const handler = (await import('../../server/api/files/serve.get')).default
    await expect(handler(makeEvent(undefined, { pathname: 'dir/missing.png' }))).rejects.toThrow()
  })

  it('成功返回 stream', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/files/serve.get')).default
    const result = await handler(makeEvent(undefined, { pathname: 'dir/1.png' }))
    expect(result).toBe('mock-stream')
  })

  it('中文文件名：Content-Disposition 全 ASCII，不触发 ERR_INVALID_CHAR', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({ id: 1, name: '中文.png', path: '/dir/1.png' } as any)
    const h3 = await import('h3')
    const spy = vi.mocked(h3.setResponseHeader)
    const handler = (await import('../../server/api/files/serve.get')).default
    await handler(makeEvent(undefined, { pathname: 'dir/1.png' }))
    const cdCall = spy.mock.calls.find((c: any[]) => c[1] === 'Content-Disposition')
    expect(cdCall).toBeTruthy()
    const value = String(cdCall![2])
    // 整个 header 值只含 ASCII（避免 Node setHeader 的 ERR_INVALID_CHAR）
    expect(value).toMatch(/^[\x00-\x7F]*$/)
    // filename* 含 RFC 5987 编码的完整原名
    expect(value).toContain("filename*=UTF-8''")
    // filename="..." 兜底部分不含非 ASCII
    expect(value).not.toMatch(/filename="[^"]*[\u0080-\uFFFF]/)
  })

  it('所有响应带 X-Content-Type-Options: nosniff（防 MIME 嗅探 XSS）', async () => {
    setMockAuthState(null)
    const h3 = await import('h3')
    const spy = vi.mocked(h3.setResponseHeader)
    const handler = (await import('../../server/api/files/serve.get')).default
    await handler(makeEvent(undefined, { pathname: 'dir/1.png' }))
    const nosniff = spy.mock.calls.find((c: any[]) => c[1] === 'X-Content-Type-Options')
    expect(nosniff).toBeTruthy()
    expect(String(nosniff![2])).toBe('nosniff')
  })

  it('SVG 响应带 CSP：禁止脚本执行（直开 XSS 兜底）', async () => {
    setMockAuthState(null)
    const h3 = await import('h3')
    const spy = vi.mocked(h3.setResponseHeader)
    const handler = (await import('../../server/api/files/serve.get')).default
    await handler(makeEvent(undefined, { pathname: 'dir/1.svg' }))
    const csp = spy.mock.calls.find((c: any[]) => c[1] === 'Content-Security-Policy')
    expect(csp).toBeTruthy()
    // default-src 'none' ⇒ script-src 继承 'none'，内联脚本与事件处理器均被拦截
    expect(String(csp![2])).toContain("default-src 'none'")
    expect(String(csp![2])).not.toMatch(/script-src/)
  })

  it('非 SVG 响应不带 CSP 头', async () => {
    setMockAuthState(null)
    const h3 = await import('h3')
    const spy = vi.mocked(h3.setResponseHeader)
    const handler = (await import('../../server/api/files/serve.get')).default
    await handler(makeEvent(undefined, { pathname: 'dir/1.png' }))
    const csp = spy.mock.calls.find((c: any[]) => c[1] === 'Content-Security-Policy')
    expect(csp).toBeUndefined()
  })

  it('头像文件：学生/访客访问返回 403（直接输入 URL 也不可读）', async () => {
    vi.mocked(guardAvatarAccess).mockImplementation(async () => {
      const err: any = new Error('头像仅教师及以上角色可查看')
      err.statusCode = 403
      throw err
    })
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/files/serve.get')).default
    await expect(handler(makeEvent(undefined, { pathname: 'dir/avatar.webp' }))).rejects.toThrow()

    setMockAuthState(null)
    await expect(handler(makeEvent(undefined, { pathname: 'dir/avatar.webp' }))).rejects.toThrow()
  })

  it('头像文件：教师可见，且 Cache-Control 为私有不可缓存', async () => {
    vi.mocked(guardAvatarAccess).mockResolvedValue(true)
    setMockAuthState({ id: 2, username: 'teacher', roles: ['teacher'], permissions: [] })
    const h3 = await import('h3')
    const spy = vi.mocked(h3.setResponseHeader)
    const handler = (await import('../../server/api/files/serve.get')).default
    const result = await handler(makeEvent(undefined, { pathname: 'dir/avatar.webp' }))
    expect(result).toBe('mock-stream')
    const cc = spy.mock.calls.find((c: any[]) => c[1] === 'Cache-Control')
    expect(String(cc![2])).toBe('private, no-store')
  })

  it('非头像文件：仍为公开长缓存', async () => {
    setMockAuthState(null)
    const h3 = await import('h3')
    const spy = vi.mocked(h3.setResponseHeader)
    const handler = (await import('../../server/api/files/serve.get')).default
    await handler(makeEvent(undefined, { pathname: 'dir/1.png' }))
    const cc = spy.mock.calls.find((c: any[]) => c[1] === 'Cache-Control')
    expect(String(cc![2])).toContain('public, max-age=31536000')
  })

  // ===== 图片水印（头像除外） =====

  it('普通图片：走水印分支，返回 Buffer 且 Content-Length 为水印图长度', async () => {
    setMockAuthState(null)
    const marked = Buffer.from('watermarked-bytes')
    vi.mocked(applyWatermark).mockResolvedValue(marked)
    const h3 = await import('h3')
    const spy = vi.mocked(h3.setResponseHeader)
    const handler = (await import('../../server/api/files/serve.get')).default
    const result = await handler(makeEvent(undefined, { pathname: 'dir/1.png' }))

    expect(result).toBe(marked)
    // 传入磁盘绝对路径与原扩展名
    expect(vi.mocked(applyWatermark)).toHaveBeenCalledWith(
      expect.stringContaining('/storage/dir/1.png'),
      '.png',
    )
    expect(spy.mock.calls).toContainEqual([expect.anything(), 'Content-Length', marked.length])
    // 返回整块 Buffer 时不设 Accept-Ranges（图片无需分段）
    expect(spy.mock.calls.find((c: any[]) => c[1] === 'Accept-Ranges')).toBeUndefined()
  })

  it('水印生成失败（null）时回退原文件流', async () => {
    setMockAuthState(null)
    vi.mocked(applyWatermark).mockResolvedValue(null)
    const handler = (await import('../../server/api/files/serve.get')).default
    const result = await handler(makeEvent(undefined, { pathname: 'dir/1.webp' }))
    expect(result).toBe('mock-stream')
  })

  it('头像图片：不加水印（直接原图流 + 私有缓存）', async () => {
    vi.mocked(guardAvatarAccess).mockResolvedValue(true)
    setMockAuthState({ id: 2, username: 'teacher', roles: ['teacher'], permissions: [] })
    const handler = (await import('../../server/api/files/serve.get')).default
    const result = await handler(makeEvent(undefined, { pathname: 'dir/avatar.webp' }))
    expect(result).toBe('mock-stream')
    expect(vi.mocked(applyWatermark)).not.toHaveBeenCalled()
  })

  it('非图片文件（pdf/mp4/svg）：不调用水印', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/files/serve.get')).default
    await handler(makeEvent(undefined, { pathname: 'dir/1.pdf' }))
    await handler(makeEvent(undefined, { pathname: 'dir/1.svg' }))
    await handler(makeEvent(undefined, { pathname: 'dir/1.mp4' }))
    expect(vi.mocked(applyWatermark)).not.toHaveBeenCalled()
  })
})

// ====================== list.get ======================

describe('API: files/list.get', () => {
  beforeEach(resetChain)

  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/files/list.get')).default
    await expect(handler(makeEvent(undefined, {}))).rejects.toThrow()
  })

  it('返回分页文件列表（个人文件）', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    // 2 次 select：1=count, 2=rows
    let callIdx = 0
    _mockDb.select = vi.fn(() => {
      const idx = callIdx++
      return {
        from: () => ({
          where: () => idx === 0
            ? Promise.resolve([{ total: 2 }])
            : {
                orderBy: () => ({
                  limit: () => ({
                    offset: () => Promise.resolve([
                      { id: 1, name: 'a.png', path: '/dir/1.png', type: 'image/png', size: 100, hash: 'h1', group: null, createdAt: new Date() },
                      { id: 2, name: 'b.png', path: '/dir/2.png', type: 'image/png', size: 200, hash: 'h2', group: null, createdAt: new Date() },
                    ]),
                  }),
                }),
              },
        }),
      }
    }) as any
    const handler = (await import('../../server/api/files/list.get')).default
    const result = await handler(makeEvent(undefined, { page: '1', pageSize: '10' }))
    expect(result.success).toBe(true)
    expect(result.data.total).toBe(2)
    expect(result.data.list).toHaveLength(2)
    expect(result.data.list[0].url).toContain('/api/files/serve?pathname=')
    expect(result.data.totalPages).toBe(1)
  })

  it('group 参数切换为小组文件过滤', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    let callIdx = 0
    _mockDb.select = vi.fn(() => {
      const idx = callIdx++
      return {
        from: () => ({
          where: () => idx === 0
            ? Promise.resolve([{ total: 0 }])
            : { orderBy: () => ({ limit: () => ({ offset: () => Promise.resolve([]) }) }) },
        }),
      }
    }) as any
    const handler = (await import('../../server/api/files/list.get')).default
    const result = await handler(makeEvent(undefined, { group: 'team-a' }))
    expect(result.success).toBe(true)
    expect(result.data.total).toBe(0)
    expect(result.data.list).toHaveLength(0)
  })

  it('pageSize 上限 100', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    let callIdx = 0
    let capturedLimit = 0
    _mockDb.select = vi.fn(() => {
      const idx = callIdx++
      return {
        from: () => ({
          where: () => idx === 0
            ? Promise.resolve([{ total: 0 }])
            : { orderBy: () => ({ limit: (n: number) => { capturedLimit = n; return { offset: () => Promise.resolve([]) } } }) },
        }),
      }
    }) as any
    const handler = (await import('../../server/api/files/list.get')).default
    await handler(makeEvent(undefined, { pageSize: '999' }))
    expect(capturedLimit).toBe(100)
  })
})

// ====================== rename.post ======================

describe('API: files/rename.post', () => {
  beforeEach(resetChain)

  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/files/rename.post')).default
    await expect(handler(makeEvent({ id: 1, name: 'new' }))).rejects.toThrow()
  })

  it('缺少 id 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/files/rename.post')).default
    const result = await handler(makeEvent({ name: 'new' }))
    expect(result.success).toBe(false)
  })

  it('缺少 name 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/files/rename.post')).default
    const result = await handler(makeEvent({ id: 1 }))
    expect(result.success).toBe(false)
  })

  it('文件不存在返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue(null as any)
    const handler = (await import('../../server/api/files/rename.post')).default
    const result = await handler(makeEvent({ id: 999, name: 'new' }))
    expect(result.success).toBe(false)
  })

  it('个人文件：非所有者不能改名', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({
      id: 1, userId: 2, group: null, name: 'old',
    } as any)
    const handler = (await import('../../server/api/files/rename.post')).default
    const result = await handler(makeEvent({ id: 1, name: 'new' }))
    expect(result.success).toBe(false)
  })

  it('个人文件：所有者可改名', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({
      id: 1, userId: 1, group: null, name: 'old',
    } as any)
    const handler = (await import('../../server/api/files/rename.post')).default
    const result = await handler(makeEvent({ id: 1, name: 'new-name' }))
    expect(result.success).toBe(true)
    expect(result.data.name).toBe('new-name')
    expect(db.update).toHaveBeenCalled()
  })

  it('小组文件：组内成员可改名', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({
      id: 2, userId: 99, group: '1_team-a', name: 'old',
    } as any)
    vi.mocked(db.query.userCourses.findMany).mockResolvedValue([{ group: 'team-a' }] as any)
    const handler = (await import('../../server/api/files/rename.post')).default
    const result = await handler(makeEvent({ id: 2, name: 'new-name' }))
    expect(result.success).toBe(true)
  })

  it('小组文件：非组内成员不可改名', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({
      id: 2, userId: 99, group: '1_team-a', name: 'old',
    } as any)
    vi.mocked(db.query.userCourses.findMany).mockResolvedValue([] as any)
    const handler = (await import('../../server/api/files/rename.post')).default
    const result = await handler(makeEvent({ id: 2, name: 'new-name' }))
    expect(result.success).toBe(false)
  })
})

// ====================== usage.get ======================

describe('API: files/usage.get', () => {
  beforeEach(resetChain)

  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/files/usage.get')).default
    await expect(handler(makeEvent())).rejects.toThrow()
  })

  it('返回配额信息（有限配额）', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    setMockDriveQuota(1073741824) // 1GB
    setMockDriveUsed(104857600)   // 100MB
    const handler = (await import('../../server/api/files/usage.get')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    expect(result.data.quota).toBe(1073741824)
    expect(result.data.used).toBe(104857600)
    expect(result.data.free).toBe(1073741824 - 104857600)
    expect(result.data.unlimited).toBe(false)
  })

  it('无限配额返回 unlimited=true', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['admin'], permissions: [] })
    setMockDriveQuota(Infinity)
    setMockDriveUsed(999999)
    const handler = (await import('../../server/api/files/usage.get')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    expect(result.data.quota).toBe(Infinity)
    expect(result.data.unlimited).toBe(true)
    expect(result.data.free).toBe(Infinity)
  })

  it('已用超过配额时 free 为 0', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    setMockDriveQuota(1000)
    setMockDriveUsed(2000)
    const handler = (await import('../../server/api/files/usage.get')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    expect(result.data.free).toBe(0)
  })
})

// ====================== files/meta.get.ts ======================
describe('API: files/meta.get', () => {
  it('未登录返回 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/files/meta.get')).default
    await expect(handler(makeEvent(undefined, { pathname: '2026/x.png' }))).rejects.toThrow()
  })

  it('按 pathname 返回原始文件名与大小', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.query.files.findFirst = vi.fn().mockResolvedValue({ name: '原图.png', size: 2048, path: '/2026/x.png' })
    const handler = (await import('../../server/api/files/meta.get')).default
    const r = await handler(makeEvent(undefined, { pathname: '2026%2Fx.png' }))
    expect(r.success).toBe(true)
    expect(r.data.name).toBe('原图.png')
    expect(r.data.size).toBe(2048)
  })

  it('文件不存在返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.query.files.findFirst = vi.fn().mockResolvedValue(null)
    const handler = (await import('../../server/api/files/meta.get')).default
    const r = await handler(makeEvent(undefined, { pathname: '2026/none.png' }))
    expect(r.success).toBe(false)
  })
})

// ====================== serve.get / file.ts — HTTP Range ======================
// 视频拖动进度条依赖 206 分段响应；这里锁定 Range 解析与头部行为。

function makeRangeEvent(range: string, pathname = 'dir/v.mp4') {
  return { ...makeEvent(undefined, { pathname }), headers: { range } } as any
}

describe('API: files/serve.get — HTTP Range', () => {
  beforeEach(resetChain)

  it('无 Range：Accept-Ranges + Content-Length，不设 206', async () => {
    setMockAuthState(null)
    const h3 = await import('h3')
    const handler = (await import('../../server/api/files/serve.get')).default
    const result = await handler(makeEvent(undefined, { pathname: 'dir/v.mp4' }))
    expect(result).toBe('mock-stream')
    expect(vi.mocked(h3.setResponseHeader).mock.calls).toContainEqual([expect.anything(), 'Accept-Ranges', 'bytes'])
    expect(vi.mocked(h3.setResponseHeader).mock.calls).toContainEqual([expect.anything(), 'Content-Length', 1024])
    expect(h3.setResponseStatus).not.toHaveBeenCalled()
  })

  it('bytes=100-199 → 206 + Content-Range，只读该段', async () => {
    setMockAuthState(null)
    const h3 = await import('h3')
    const fs = await import('fs')
    const handler = (await import('../../server/api/files/serve.get')).default
    const result = await handler(makeRangeEvent('bytes=100-199'))
    expect(result).toBe('mock-stream')
    expect(vi.mocked(h3.setResponseStatus)).toHaveBeenCalledWith(expect.anything(), 206)
    expect(vi.mocked(h3.setResponseHeader).mock.calls).toContainEqual([expect.anything(), 'Content-Range', 'bytes 100-199/1024'])
    expect(vi.mocked(h3.setResponseHeader).mock.calls).toContainEqual([expect.anything(), 'Content-Length', 100])
    expect(vi.mocked(fs.createReadStream)).toHaveBeenCalledWith(expect.any(String), { start: 100, end: 199 })
  })

  it('bytes=100- → 206，读到文件末尾', async () => {
    setMockAuthState(null)
    const h3 = await import('h3')
    const handler = (await import('../../server/api/files/serve.get')).default
    await handler(makeRangeEvent('bytes=100-'))
    expect(vi.mocked(h3.setResponseHeader).mock.calls).toContainEqual([expect.anything(), 'Content-Range', 'bytes 100-1023/1024'])
    expect(vi.mocked(h3.setResponseHeader).mock.calls).toContainEqual([expect.anything(), 'Content-Length', 924])
  })

  it('bytes=-50 → 206，取最后 50 字节', async () => {
    setMockAuthState(null)
    const h3 = await import('h3')
    const fs = await import('fs')
    const handler = (await import('../../server/api/files/serve.get')).default
    await handler(makeRangeEvent('bytes=-50'))
    expect(vi.mocked(h3.setResponseHeader).mock.calls).toContainEqual([expect.anything(), 'Content-Range', 'bytes 974-1023/1024'])
    expect(vi.mocked(fs.createReadStream)).toHaveBeenCalledWith(expect.any(String), { start: 974, end: 1023 })
  })

  it('越界 Range（start >= size）→ 416 + Content-Range: bytes */size', async () => {
    setMockAuthState(null)
    const h3 = await import('h3')
    const handler = (await import('../../server/api/files/serve.get')).default
    const result = await handler(makeRangeEvent('bytes=2000-3000'))
    expect(vi.mocked(h3.setResponseStatus)).toHaveBeenCalledWith(expect.anything(), 416)
    expect(vi.mocked(h3.setResponseHeader).mock.calls).toContainEqual([expect.anything(), 'Content-Range', 'bytes */1024'])
    expect(result).toBe('')
  })

  it('无法识别的 Range 头按整文件返回（200）', async () => {
    setMockAuthState(null)
    const h3 = await import('h3')
    const handler = (await import('../../server/api/files/serve.get')).default
    const result = await handler(makeRangeEvent('bytes=abc-def'))
    expect(result).toBe('mock-stream')
    expect(h3.setResponseStatus).not.toHaveBeenCalled()
    expect(vi.mocked(h3.setResponseHeader).mock.calls).toContainEqual([expect.anything(), 'Content-Length', 1024])
  })
})

describe('API: file.ts (legacy /api/file) — HTTP Range', () => {
  beforeEach(resetChain)

  it('带 Range 返回 206 分段', async () => {
    setMockAuthState(null)
    const h3 = await import('h3')
    const handler = (await import('../../server/api/file')).default
    const result = await handler(makeRangeEvent('bytes=0-9'))
    expect(result).toBe('mock-stream')
    expect(vi.mocked(h3.setResponseStatus)).toHaveBeenCalledWith(expect.anything(), 206)
    expect(vi.mocked(h3.setResponseHeader).mock.calls).toContainEqual([expect.anything(), 'Content-Range', 'bytes 0-9/1024'])
  })
})
