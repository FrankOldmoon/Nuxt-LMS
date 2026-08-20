/**
 * WebSocket 连接认证解析
 *
 * WS 升级请求（peer.request，同源连接）会携带 auth_token Cookie，
 * 通过该 Cookie 解析出当前登录用户，供：
 *  - registerUser 身份校验（防止冒充他人接收私信）
 *  - 房间 join 鉴权（防止未登录用户进入班级/小组房间窃听）
 *
 * 解析结果缓存到 peer._auth*，避免每条消息重复查库。
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'

/** 从 WS 升级请求的 Cookie 头中提取 auth_token */
export function getWsAuthToken(peer: any): string | undefined {
  try {
    const headers = peer?.request?.headers
    const cookie = headers && typeof headers.get === 'function'
      ? headers.get('cookie')
      : undefined
    if (!cookie) return undefined
    const m = /(?:^|;\s*)auth_token=([^;]+)/.exec(String(cookie))
    return m ? decodeURIComponent(m[1]) : undefined
  } catch {
    return undefined
  }
}

/**
 * 解析 WS 连接对应的登录用户（含角色），未登录/无效 token 返回 null。
 * 幂等：首次解析后结果缓存，不会重复查库。
 */
export async function resolveWsAuthUser(peer: any) {
  if (peer._authResolved) return peer._authUser || null
  peer._authResolved = true
  peer._authUser = null
  peer._authUserId = null
  peer._authUserName = null
  try {
    const tokenStr = getWsAuthToken(peer)
    if (!tokenStr) return null

    const tokens = await db
      .select({ userId: schema.tokens.userId })
      .from(schema.tokens)
      .where(and(eq(schema.tokens.name, tokenStr), isNull(schema.tokens.deletedAt)))
      .limit(1)
    if (!tokens[0]) return null

    const users = await db
      .select({ id: schema.users.id, name: schema.users.name })
      .from(schema.users)
      .where(eq(schema.users.id, tokens[0].userId))
      .limit(1)
    if (!users[0]) return null

    const roleRows = await db
      .select({ code: schema.roles.code })
      .from(schema.userRoles)
      .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
      .where(eq(schema.userRoles.userId, users[0].id))

    const authUser = {
      id: users[0].id,
      name: users[0].name,
      roles: roleRows.map((r) => r.code),
    }
    peer._authUser = authUser
    peer._authUserId = authUser.id
    peer._authUserName = authUser.name
    return authUser
  } catch {
    return null
  }
}
