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
  /** 本次获得经验（0 也表示未获得） */
  gainedExp?: number
  /** 本次获得金币（可选） */
  gainedCoin?: number
}

/** 读取 danmaku 配置（取自 LMS 配置缓存，未加载则返回默认） */
function getDanmakuCfg(): {
  enableDanmaku: boolean
  enableOnQuestion: boolean
  enableOnHomework: boolean
  enableOnQuiz: boolean
  enableOnComment: boolean
  questionOnlyOnCorrect: boolean
  onlyOnReward: boolean
} {
  try {
    const cfg = getLmsConfigSync() || {}
    const d = (cfg.danmaku && typeof cfg.danmaku === 'object') ? cfg.danmaku : {}
    return {
      enableDanmaku: d.enableDanmaku !== false,
      enableOnQuestion: d.enableOnQuestion !== false,
      enableOnHomework: d.enableOnHomework !== false,
      enableOnQuiz: d.enableOnQuiz !== false,
      enableOnComment: d.enableOnComment !== false,
      questionOnlyOnCorrect: d.questionOnlyOnCorrect !== false,
      onlyOnReward: d.onlyOnReward !== false,
    }
  } catch {
    // 测试环境或未初始化：使用默认（全开 + 严格过滤）
    return {
      enableDanmaku: true,
      enableOnQuestion: true,
      enableOnHomework: true,
      enableOnQuiz: true,
      enableOnComment: true,
      questionOnlyOnCorrect: true,
      onlyOnReward: true,
    }
  }
}

/**
 * 过滤规则：是否允许本次广播。
 *  - per-kind 总开关
 *  - questionOnlyOnCorrect：题目答错时拦截
 *  - onlyOnReward：当 gainedExp 已传入时（question/homework/quiz），仅在 >0 时放行
 *  - comment：默认 always-on（不依赖 gainedExp）
 */
function shouldBroadcast(
  args: BroadcastSubmitDanmakuArgs,
  cfg: ReturnType<typeof getDanmakuCfg>,
): boolean {
  // 0) 弹幕收发总开关关闭 → 任何提交自动弹幕都不广播
  if (cfg.enableDanmaku === false) return false

  // 1) per-kind 总开关
  const switchMap: Record<SubmitDanmakuKind, boolean> = {
    question: cfg.enableOnQuestion,
    homework: cfg.enableOnHomework,
    quiz: cfg.enableOnQuiz,
    comment: cfg.enableOnComment,
  }
  if (switchMap[args.kind] === false) return false

  // 2) 题目答错不广播
  if (args.kind === 'question'
    && args.isCorrect === false
    && cfg.questionOnlyOnCorrect) {
    return false
  }

  // 3) 仅在有奖励时广播（仅对显式传入 gainedExp 的类型生效）
  if (cfg.onlyOnReward
    && args.kind !== 'comment'
    && args.gainedExp !== undefined
    && args.gainedExp !== null) {
    const exp = Number(args.gainedExp)
    if (!Number.isFinite(exp) || exp <= 0) return false
  }

  return true
}

/**
 * 根据 kind + 结果返回弹幕 i18n 描述（key + 插值参数）。
 * 服务端不拼中文/英文文案，由客户端用自身语言环境通过 i18n 渲染，
 * 这样不同语言的同学收到的弹幕都是本地化文本。
 */
function buildDanmakuText(args: BroadcastSubmitDanmakuArgs): { key: string; params: Record<string, number | string> } | null {
  const exp = Number(args.gainedExp) || 0
  switch (args.kind) {
    case 'question':
      return args.isCorrect
        ? { key: 'danmaku.questionCorrect', params: { exp } }
        : { key: 'danmaku.questionSubmit', params: {} }
    case 'homework':
      return { key: 'danmaku.homeworkSubmit', params: { exp } }
    case 'quiz': {
      const score = Math.round(Number(args.score) || 0)
      return {
        key: args.isPassed ? 'danmaku.quizPassed' : 'danmaku.quizFailed',
        params: { score },
      }
    }
    case 'comment':
      return { key: 'danmaku.comment', params: {} }
    default:
      return { key: 'danmaku.submit', params: {} }
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
      // 弹幕来源显示 preferName > name > username
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
 * - 配置过滤：danmaku.enableOn{Kind}、questionOnlyOnCorrect、onlyOnReward。
 *   任一规则不满足时静默跳过（不广播）。
 */
export async function broadcastSubmitDanmaku(args: BroadcastSubmitDanmakuArgs): Promise<void> {
  try {
    const cfg = getDanmakuCfg()
    if (!shouldBroadcast(args, cfg)) return

    const ctx = await resolveUserClassContext(args.userId)
    if (!ctx) return
    const i18n = buildDanmakuText(args)
    if (!i18n) return
    broadcastToClass(ctx.classId, JSON.stringify({
      type: 'danmaku',
      // 携带 i18n key + 参数，由客户端本地化渲染（区别于用户手发弹幕的 text 字段）
      i18n,
      from: ctx.name,
    }))
  } catch (err) {
    // 广播失败不应影响提交主流程
    console.error('[broadcastSubmitDanmaku] failed:', err)
  }
}
