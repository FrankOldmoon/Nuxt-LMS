/**
 * Broadcast a danmaku notification to the class channel after submission
 *
 * Scenario: After a user submits question / homework / quiz / comment,
 *           broadcast a friendly danmaku message via WebSocket class room,
 *           so classmates can see it and create an interactive atmosphere.
 *
 * Design notes:
 *  - Goes through `broadcastToClass` (the same broadcast already used in class-handlers); the client
 *    `chapter/danmaku/index.vue` has registered an `onDanmaku` callback that consumes it directly.
 *  - The user's classId / displayName are fetched in a single SELECT to avoid N+1.
 *  - Fully fire-and-forget: callers use `void broadcastSubmitDanmaku(...)`
 *    to explicitly indicate "no await", not blocking the HTTP response; internal try/catch swallows all errors,
 *    so broadcast failure will not drag down the submission request.
 *  - Exposed via Nuxt auto-import; tests can inject mocks into globalThis.
 */
import { eq } from 'drizzle-orm'
import { db, schema } from '@nuxthub/db'
import { broadcastToClass } from './state'

export type SubmitDanmakuKind = 'question' | 'homework' | 'quiz' | 'comment'

export interface BroadcastSubmitDanmakuArgs {
  /** Submitter userId (from requireAuth) */
  userId: number
  kind: SubmitDanmakuKind
  /** Whether the question is answered correctly; ignored for non-question kinds */
  isCorrect?: boolean
  /** Quiz total score; ignored for non-quiz kinds */
  score?: number
  /** Whether the quiz passed; ignored for non-quiz kinds */
  isPassed?: boolean
  /** Exp gained this time (0 also means none) */
  gainedExp?: number
  /** Coin gained this time (optional) */
  gainedCoin?: number
}

/** Read danmaku config (from LMS config cache; returns defaults if not loaded) */
function getDanmakuCfg(): {
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
      enableOnQuestion: d.enableOnQuestion !== false,
      enableOnHomework: d.enableOnHomework !== false,
      enableOnQuiz: d.enableOnQuiz !== false,
      enableOnComment: d.enableOnComment !== false,
      questionOnlyOnCorrect: d.questionOnlyOnCorrect !== false,
      onlyOnReward: d.onlyOnReward !== false,
    }
  } catch {
    // Test environment or uninitialized: use defaults (all on + strict filtering)
    return {
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
 * Filter rules: whether to allow this broadcast.
 *  - per-kind master switch
 *  - questionOnlyOnCorrect: blocks when the question is answered wrong
 *  - onlyOnReward: when gainedExp is provided (question/homework/quiz), only allows when >0
 *  - comment: always-on by default (does not depend on gainedExp)
 */
function shouldBroadcast(
  args: BroadcastSubmitDanmakuArgs,
  cfg: ReturnType<typeof getDanmakuCfg>,
): boolean {
  // 1) per-kind master switch
  const switchMap: Record<SubmitDanmakuKind, boolean> = {
    question: cfg.enableOnQuestion,
    homework: cfg.enableOnHomework,
    quiz: cfg.enableOnQuiz,
    comment: cfg.enableOnComment,
  }
  if (switchMap[args.kind] === false) return false

  // 2) Do not broadcast when the question is answered wrong
  if (args.kind === 'question'
    && args.isCorrect === false
    && cfg.questionOnlyOnCorrect) {
    return false
  }

  // 3) Only broadcast when there is a reward (only applies to kinds with explicit gainedExp)
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
 * Build danmaku text based on kind + result (full format with emoji + score info)
 * A single danmaku is limited to 200 characters (consistent with the existing danmaku protocol).
 */
function buildDanmakuText(args: BroadcastSubmitDanmakuArgs): string {
  const exp = Number(args.gainedExp) || 0
  switch (args.kind) {
    case 'question':
      return args.isCorrect
        ? `🎉 Answered a question correctly (+${exp} exp)`
        : `💪 Submitted a question`
    case 'homework':
      return `📚 Submitted homework (+${exp} exp)`
    case 'quiz': {
      const score = Math.round(Number(args.score) || 0)
      return args.isPassed
        ? `🎊 Completed a quiz (${score} points)`
        : `📝 Completed a quiz (${score} points)`
    }
    case 'comment':
      return `💬 Posted a comment`
    default:
      return 'Submitted'
  }
}

/**
 * Asynchronously query the user's classId + display name (preferName > name > username).
 * Any error is swallowed (returns null), and the caller silently skips the broadcast.
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
 * Broadcast danmaku to the submitter's class room after submission.
 * - Callers should use `void broadcastSubmitDanmaku(...)` to explicitly fire-and-forget.
 * - No classId / no online peer / any exception will not throw.
 * - Config filtering: danmaku.enableOn{Kind}, questionOnlyOnCorrect, onlyOnReward.
 *   Silently skips (no broadcast) when any rule is not satisfied.
 */
export async function broadcastSubmitDanmaku(args: BroadcastSubmitDanmakuArgs): Promise<void> {
  try {
    const cfg = getDanmakuCfg()
    if (!shouldBroadcast(args, cfg)) return

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
    // Broadcast failure should not affect the main submission flow
    console.error('[broadcastSubmitDanmaku] failed:', err)
  }
}
