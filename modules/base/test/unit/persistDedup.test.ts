/**
 * persistUploadedFile 23505 恢复逻辑测试
 * @see modules/base/server/utils/upload/persist.ts
 *
 * 关键点：drizzle 会把驱动错误包装成 DrizzleQueryError（cause 上才是
 * PostgresError 的 code/constraint_name），恢复分支必须解包判断。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mkdtemp, writeFile, readFile, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// —— mock @nuxthub/db：只用到 insert / update / query.files.findFirst ——
// vi.hoisted：vi.mock 工厂被提升到文件顶部执行，mock 对象必须随之提升
const { _mockDb, _mockSchema, _insertReturning, _updateReturning, _findFirst } = vi.hoisted(() => {
  const _insertReturning = vi.fn()
  const _updateReturning = vi.fn()
  const _findFirst = vi.fn()
  const _mockDb = {
    insert: vi.fn(() => ({ values: () => ({ returning: _insertReturning }) })),
    update: vi.fn(() => ({ set: () => ({ where: () => ({ returning: _updateReturning }) }) })),
    query: { files: { findFirst: _findFirst } },
  }
  const _mockSchema = {
    files: {
      id: 'id', name: 'name', hash: 'hash', path: 'path', type: 'type',
      size: 'size', userId: 'userId', group: 'group', deletedAt: 'deletedAt',
    },
  }
  return { _mockDb, _mockSchema, _insertReturning, _updateReturning, _findFirst }
})
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

import { persistUploadedFile, sha256Hex, dayDirNameFn } from '../../server/utils/upload/persist'

/** 构造 drizzle 包装错误：外层 DrizzleQueryError，cause 上是 PostgresError */
function makeWrappedUniqueViolation() {
  const pgErr: any = new Error('duplicate key value violates unique constraint "files_path_unique"')
  pgErr.name = 'PostgresError'
  pgErr.code = '23505'
  pgErr.constraint_name = 'files_path_unique'
  const wrapped: any = new Error('Failed query: insert into "files" ...')
  wrapped.name = 'DrizzleQueryError'
  wrapped.cause = pgErr
  return wrapped
}

const buffer = Buffer.from('fake-webp-content')
const hash = sha256Hex(buffer)

let uploadRoot: string

beforeEach(async () => {
  vi.clearAllMocks()
  uploadRoot = await mkdtemp(join(tmpdir(), 'persist-test-'))
  _insertReturning.mockReset()
  _updateReturning.mockReset()
  _findFirst.mockReset()
})

async function fileExists(p: string) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

describe('persistUploadedFile: 23505 唯一冲突恢复', () => {
  it('软删记录 → 复活并返回 deduplicated，物理文件保留', async () => {
    _insertReturning.mockRejectedValue(makeWrappedUniqueViolation())
    _updateReturning.mockResolvedValue([{ id: 99, path: `/233/${hash}.webp` }])

    const result = await persistUploadedFile({
      buffer, hash, ext: '.webp', originalName: 'a.webp',
      fileType: 'image/webp', group: '', userId: 1, uploadRoot,
    })

    expect(result).toEqual({ id: 99, finalDbPath: `/${dayDirNameFn()}/${hash}.webp`, deduplicated: true })
    // update 复活：deletedAt 置空 + 元数据更新
    expect(_mockDb.update).toHaveBeenCalled()
    // 物理文件未被删除，且内容正确
    const onDisk = await readFile(join(uploadRoot, dayDirNameFn(), `${hash}.webp`))
    expect(onDisk.equals(buffer)).toBe(true)
  })

  it('活跃记录（group 不同/并发）→ 复用现有记录', async () => {
    _insertReturning.mockRejectedValue(makeWrappedUniqueViolation())
    _updateReturning.mockResolvedValue([]) // 无软删记录
    _findFirst.mockResolvedValue({ id: 7, path: `/233/${hash}.webp` })

    const result = await persistUploadedFile({
      buffer, hash, ext: '.webp', originalName: 'a.webp',
      fileType: 'image/webp', group: 'avatar', userId: 1, uploadRoot,
    })

    expect(result).toEqual({ id: 7, finalDbPath: `/${dayDirNameFn()}/${hash}.webp`, deduplicated: true })
    expect(await fileExists(join(uploadRoot, dayDirNameFn(), `${hash}.webp`))).toBe(true)
  })

  it('非 23505 错误 → 删除临时文件并抛出', async () => {
    _insertReturning.mockRejectedValue(new Error('connection refused'))

    await expect(persistUploadedFile({
      buffer, hash, ext: '.webp', originalName: 'a.webp',
      fileType: 'image/webp', group: '', userId: 1, uploadRoot,
    })).rejects.toThrow('connection refused')

    expect(await fileExists(join(uploadRoot, dayDirNameFn(), `${hash}.webp`))).toBe(false)
  })

  it('包装层错误但 cause 不是 23505 → 删除临时文件并抛出原始错误', async () => {
    const wrapped: any = new Error('Failed query: ...')
    wrapped.cause = Object.assign(new Error('other'), { code: '42P01' })
    _insertReturning.mockRejectedValue(wrapped)

    await expect(persistUploadedFile({
      buffer, hash, ext: '.webp', originalName: 'a.webp',
      fileType: 'image/webp', group: '', userId: 1, uploadRoot,
    })).rejects.toThrow('Failed query')

    expect(await fileExists(join(uploadRoot, dayDirNameFn(), `${hash}.webp`))).toBe(false)
  })

  it('正常插入 → 返回新记录 id，无 deduplicated 标志', async () => {
    _insertReturning.mockResolvedValue([{ id: 5 }])

    const result = await persistUploadedFile({
      buffer, hash, ext: '.webp', originalName: 'a.webp',
      fileType: 'image/webp', group: '', userId: 1, uploadRoot,
    })

    expect(result).toEqual({ id: 5, finalDbPath: `/${dayDirNameFn()}/${hash}.webp` })
    expect(_mockDb.update).not.toHaveBeenCalled()
  })
})
