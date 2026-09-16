/**
 * Showcase 作品参与用户（多对多 showcase_users）查询与入参归一化。
 */
import { db, schema } from '@nuxthub/db'
import { eq, inArray } from 'drizzle-orm'

export interface ShowcaseMember {
  id: number
  name: string
  username: string
  avatarImg: string | null
  avatarFrame: string | null
}

/** 归一化参与用户 id 列表：去重、过滤非法值、最多 100 个 */
export function normalizeShowcaseUserIds(input: any): number[] {
  if (!Array.isArray(input)) return []
  const out: number[] = []
  const seen = new Set<number>()
  for (const raw of input) {
    const id = Number(raw)
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue
    seen.add(id)
    out.push(id)
    if (out.length >= 100) break
  }
  return out
}

/** 批量查询多件作品的参与用户：showcaseId -> 用户列表（按加入顺序） */
export async function getShowcaseMembersMap(showcaseIds: number[]): Promise<Map<number, ShowcaseMember[]>> {
  const map = new Map<number, ShowcaseMember[]>()
  const ids = [...new Set(showcaseIds.filter(id => Number.isInteger(id) && id > 0))]
  if (!ids.length) return map

  const links = await db
    .select({
      showcaseId: schema.showcaseUsers.showcaseId,
      userId: schema.showcaseUsers.userId,
      createdAt: schema.showcaseUsers.createdAt,
    })
    .from(schema.showcaseUsers)
    .where(inArray(schema.showcaseUsers.showcaseId, ids))
  if (!links.length) return map

  const userIds = [...new Set(links.map(l => l.userId))]
  const users = userIds.length
    ? await db.query.users.findMany({ where: inArray(schema.users.id, userIds) })
    : []
  const userMap = new Map((users as any[]).map((u: any) => [u.id, u]))

  const ordered = [...links].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt as any).getTime() : 0
    const tb = b.createdAt ? new Date(b.createdAt as any).getTime() : 0
    return ta - tb
  })
  for (const link of ordered) {
    const u: any = userMap.get(link.userId)
    if (!u) continue
    if (!map.has(link.showcaseId)) map.set(link.showcaseId, [])
    map.get(link.showcaseId)!.push({
      id: u.id,
      name: u.name || u.username || `User ${u.id}`,
      username: u.username || '',
      avatarImg: u.avatarImg || null,
      avatarFrame: u.avatarFrame || null,
    })
  }
  return map
}

/** 查询单件作品的参与用户 */
export async function getShowcaseMembers(showcaseId: number): Promise<ShowcaseMember[]> {
  const map = await getShowcaseMembersMap([showcaseId])
  return map.get(showcaseId) || []
}

/** 替换参与用户（先清空再写入） */
export async function setShowcaseMembers(showcaseId: number, userIds: number[]): Promise<void> {
  await db.delete(schema.showcaseUsers).where(eq(schema.showcaseUsers.showcaseId, showcaseId))
  if (!userIds.length) return
  await db.insert(schema.showcaseUsers).values(userIds.map(userId => ({ showcaseId, userId })))
}
