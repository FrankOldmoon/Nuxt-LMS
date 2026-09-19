/**
 * 访问来源策略单元测试
 * @see modules/base/server/utils/auth/hostPolicy.ts
 *
 * 非 IP 的 URL（正式域名）访问时，访问门 / 登录仅允许教师及以上（admin/teacher/observer）；
 * IP 字面量与 localhost 放行（本地开发需要登录学生账号调试）。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const { _mockDb } = vi.hoisted(() => ({
  _mockDb: { select: vi.fn(), from: vi.fn(), innerJoin: vi.fn(), where: vi.fn() },
}))
vi.mock('@nuxthub/db', () => ({
  db: _mockDb,
  schema: {
    roles: { id: 'id', code: 'code' },
    userRoles: { userId: 'userId', roleId: 'roleId' },
  },
}))

import {
  requestHostname, isIpLiteral, isNonIpHostUrl,
  getUserRoleCodes, canPassGatedLogin, isGatedLoginAllowed,
} from '../../server/utils/auth/hostPolicy'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

const ev = (host: string) => ({ headers: { host } } as any)

beforeEach(() => {
  resetAllStubs()
  _mockDb.select.mockReturnValue(_mockDb)
  _mockDb.from.mockReturnValue(_mockDb)
  _mockDb.innerJoin.mockReturnValue(_mockDb)
  _mockDb.where.mockResolvedValue([])
})

describe('auth/hostPolicy - Host 解析', () => {
  it('去端口 / IPv6 去方括号 / 大小写归一', () => {
    expect(requestHostname(ev('Example.com:3000'))).toBe('example.com')
    expect(requestHostname(ev('192.168.1.10:8080'))).toBe('192.168.1.10')
    expect(requestHostname(ev('[::1]:3000'))).toBe('::1')
    expect(requestHostname(ev(''))).toBe('')
  })

  it('isIpLiteral', () => {
    expect(isIpLiteral('127.0.0.1')).toBe(true)
    expect(isIpLiteral('192.168.1.10')).toBe(true)
    expect(isIpLiteral('::1')).toBe(true)
    expect(isIpLiteral('lms.example.com')).toBe(false)
  })

  it('isNonIpHostUrl：域名受限；IP / localhost / 无 Host 放行', () => {
    expect(isNonIpHostUrl(ev('lms.example.com'))).toBe(true)
    expect(isNonIpHostUrl(ev('lms.example.com:443'))).toBe(true)
    expect(isNonIpHostUrl(ev('localhost:3004'))).toBe(false)
    expect(isNonIpHostUrl(ev('127.0.0.1:3004'))).toBe(false)
    expect(isNonIpHostUrl(ev('[::1]:3004'))).toBe(false)
    expect(isNonIpHostUrl({ headers: {} } as any)).toBe(false)
  })
})

describe('auth/hostPolicy - 角色判定', () => {
  it('getUserRoleCodes 返回角色 code 列表', async () => {
    _mockDb.where.mockResolvedValue([{ code: 'teacher' }, { code: 'observer' }])
    expect(await getUserRoleCodes(7)).toEqual(['teacher', 'observer'])
  })

  it('canPassGatedLogin：教师及以上放行；学生 / 无角色拒绝', async () => {
    for (const code of ['admin', 'teacher', 'observer']) {
      _mockDb.where.mockResolvedValue([{ code }])
      expect(await canPassGatedLogin(1)).toBe(true)
    }
    _mockDb.where.mockResolvedValue([{ code: 'student' }])
    expect(await canPassGatedLogin(1)).toBe(false)
    _mockDb.where.mockResolvedValue([])
    expect(await canPassGatedLogin(1)).toBe(false)
  })

  it('isGatedLoginAllowed：IP / localhost 不看角色直接放行；域名需教师及以上', async () => {
    _mockDb.where.mockResolvedValue([{ code: 'student' }])
    expect(await isGatedLoginAllowed(ev('127.0.0.1:3004'), 1)).toBe(true)
    expect(await isGatedLoginAllowed(ev('localhost:3004'), 1)).toBe(true)
    expect(await isGatedLoginAllowed(ev('lms.example.com'), 1)).toBe(false)

    _mockDb.where.mockResolvedValue([{ code: 'teacher' }])
    expect(await isGatedLoginAllowed(ev('lms.example.com'), 1)).toBe(true)
  })
})
