/**
 * 提交后向班级频道广播一条弹幕通知
 *
 * 场景：用户提交 question / homework / quiz / comment 后，
 *       通过 WebSocket 班级房间广播一条友好的 danmaku 消息，
 *       让同班同学看到并产生互动氛围。
 *
 * 设计要点：
 *  - 走 `broadcastToClass`（class-handlers 中已有同款广播），客户端
 *    `chapter/danmaku/index.vue` 已注册 `onDanmaku` 回调直接消费。
 *  - 用户 classId / displayName 通过单次 SELECT 一次性查回，避免 N+1。
 *  - 完全 fire-and-forget：调用方用 `void broadcastSubmitDanmaku(...)`
 *    显式表达"不 await"，不阻塞 HTTP 响应；内部 try/catch 吞掉所有错误，
 *    不会让广播失败拖垮提交请求。
 *  - 通过 Nuxt auto-import 暴露，测试可在 globalThis 注入 mock。
 */
import { eq } from 'drizzle-orm'
import { db, schema } from '@nuxthub/db'
import { broadcastToClass } from './state'

export type SubmitDanmakuKind = 'question' | 'homework' | 'quiz' | 'comment'

export interface BroadcastSubmitDanmakuArgs {
  /** 提交者 userId（来自 requireAuth） */
  userId: number
  kind: SubmitDanmakuKind
  /** question 是否答对；question 之外忽略 */
  isCorrect?: boolean
  /** quiz 总分；quiz 之外忽略 */
  score?: number
  /** quiz 是否及格；quiz 之外忽略 */
  isPassed?: boolean
  /** 本次获得经验（0 也显示为 +0） */
  gainedExp?: number
  /** 本次获得金币（可选） */
  gainedCoin?: number
}

/**
 * 根据 kind + 结果拼接弹幕文本（带 emoji + 得分信息的完整格式）
 * 单条弹幕限 200 字符以内（与现有 danmaku 协议一致）。
 */
function buildDanmakuText(args: BroadcastSubmitDanmakuArgs): string {
  const exp = Number(args.gainedExp) || 0
  switch (args.kind) {
    case 'question':
      return args.isCorrect
        ? `🎉 答对了题目 (+${exp}经验)`
        : `💪 提交了题目`
    case 'homework':
      return `📚 提交了作业 (+${exp}经验)`
    case 'quiz': {
      const score = Math.round(Number(args.score) || 0)
      return args.isPassed
        ? `🎊 完成了测验 (${score}分)`
        : `📝 完成了测验 (${score}分)`
    }
    case 'comment':
      return `💬 发表了评论`
    default:
      return '提交了'
  }
}

/**
 * 异步查 user 的 classId + 显示名（preferName > name > username）。
 * 任何错误都吞掉（返回 null），由调用方静默跳过广播。
 */
async function resolveUserClassContext(userId: number): Promise<{ classId: number; name: string } | null> {
  try {
    const rows = await db
      .select({
        classId: schema.users.classId,
        name: schema.users.name,
        preferName: schema.users.preferName,
        username: schema.users.username,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1)
    const u: any = rows[0]
    if (!u || !u.classId) return null
    return {
      classId: Number(u.classId),
      name: String(u.preferName || u.name || u.username || 'anonymous'),
    }
  } catch {
    return null
  }
}

/**
 * 提交后向提交者所在班级房间广播 danmaku。
 * - 调用方应使用 `void broadcastSubmitDanmaku(...)` 显式 fire-and-forget。
 * - 无 classId / 无在线 peer / 任何异常都不会抛出。
 */
export async function broadcastSubmitDanmaku(args: BroadcastSubmitDanmakuArgs): Promise<void> {
  try {
    const ctx = await resolveUserClassContext(args.userId)
    if (!ctx) return
    const text = buildDanmakuText(args)
    if (!text) return
    broadcastToClass(ctx.classId, JSON.stringify({
      type: 'danmaku',
      text: text.slice(0, 200),
      from: ctx.name,
    }))
  } catch (err) {
    // 广播失败不应影响提交主流程
    console.error('[broadcastSubmitDanmaku] failed:', err)
  }
}
