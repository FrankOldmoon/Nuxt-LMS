import { db, schema } from '@nuxthub/db'
import { eq, and, count, sql, isNull } from 'drizzle-orm'

// ====================== 类型定义 ======================

/** 奖章条件：某个指标达到某个值 */
export interface MedalCondition {
  /** 指标名：courseScore / exp / level / questionScore / homeworkScore / commentScore / quizScore / raceScore / questionCount / homeworkCount / commentCount / chapterPassCount */
  metric: string
  /** 运算符：>= / > / <= / < / == */
  op: string
  /** 阈值 */
  value: number
}

/** 奖章配置（存入 medals.content） */
export interface MedalContent {
  /** 图标名（lucide） */
  icon: string
  /** 颜色：bronze / silver / gold / diamond / primary / success / warning / error / info */
  color: string
  /** 层级：1=铜 2=银 3=金 4=钻 */
  tier: number
  /** 描述 */
  description: string
  /** 条件列表 */
  conditions: MedalCondition[]
  /** 条件逻辑：all=全部满足 / any=任一满足 */
  logic: 'all' | 'any'
}

/** 可查询的用户指标 */
export interface UserMetrics {
  courseScore: number
  exp: number
  level: number
  questionScore: number
  homeworkScore: number
  commentScore: number
  quizScore: number
  raceScore: number
  questionCount: number
  homeworkCount: number
  commentCount: number
  chapterPassCount: number
}

// ====================== 默认奖章 ======================

export const DEFAULT_MEDALS: { name: string; content: MedalContent }[] = [
  {
    name: 'First Steps',
    content: {
      icon: 'i-lucide-sprout', color: 'success', tier: 1,
      description: 'Complete your first question',
      conditions: [{ metric: 'questionCount', op: '>=', value: 1 }],
      logic: 'all',
    },
  },
  {
    name: 'Diligent Star',
    content: {
      icon: 'i-lucide-zap', color: 'warning', tier: 2,
      description: 'Answer 50 questions',
      conditions: [{ metric: 'questionCount', op: '>=', value: 50 }],
      logic: 'all',
    },
  },
  {
    name: 'Homework Master',
    content: {
      icon: 'i-lucide-book-open-check', color: 'info', tier: 2,
      description: 'Submit 10 homework assignments',
      conditions: [{ metric: 'homeworkCount', op: '>=', value: 10 }],
      logic: 'all',
    },
  },
  {
    name: 'Commentator',
    content: {
      icon: 'i-lucide-message-circle', color: 'primary', tier: 1,
      description: 'Post 20 comments',
      conditions: [{ metric: 'commentCount', op: '>=', value: 20 }],
      logic: 'all',
    },
  },
  {
    name: 'Quiz Expert',
    content: {
      icon: 'i-lucide-clipboard-check', color: 'info', tier: 3,
      description: 'Score 100 in quizzes',
      conditions: [{ metric: 'quizScore', op: '>=', value: 100 }],
      logic: 'all',
    },
  },
  {
    name: 'Race Champion',
    content: {
      icon: 'i-lucide-trophy', color: 'error', tier: 3,
      description: 'Score 100 in races',
      conditions: [{ metric: 'raceScore', op: '>=', value: 100 }],
      logic: 'all',
    },
  },
  {
    name: 'Scholar',
    content: {
      icon: 'i-lucide-graduation-cap', color: 'warning', tier: 3,
      description: 'Reach 500 total course score',
      conditions: [{ metric: 'courseScore', op: '>=', value: 500 }],
      logic: 'all',
    },
  },
  {
    name: 'Level Achiever',
    content: {
      icon: 'i-lucide-star', color: 'warning', tier: 2,
      description: 'Reach level 5',
      conditions: [{ metric: 'level', op: '>=', value: 5 }],
      logic: 'all',
    },
  },
  {
    name: 'Chapter Master',
    content: {
      icon: 'i-lucide-flag', color: 'error', tier: 4,
      description: 'Complete 10 chapters',
      conditions: [{ metric: 'chapterPassCount', op: '>=', value: 10 }],
      logic: 'all',
    },
  },
  {
    name: 'Diamond Scholar',
    content: {
      icon: 'i-lucide-gem', color: 'info', tier: 4,
      description: 'Reach 1000 course score and level 10',
      conditions: [
        { metric: 'courseScore', op: '>=', value: 1000 },
        { metric: 'level', op: '>=', value: 10 },
      ],
      logic: 'all',
    },
  },
]

// ====================== 指标采集 ======================

/** 收集用户在某课程下的全部指标 */
export async function collectUserMetrics(userId: number, courseId: number): Promise<UserMetrics> {
  // userCourses 基础分数
  const uc = await db
    .select({
      score: schema.userCourses.score,
      exp: schema.userCourses.exp,
      questionScore: schema.userCourses.questionScore,
      homeworkScore: schema.userCourses.homeworkScore,
      commentScore: schema.userCourses.commentScore,
      quizScore: schema.userCourses.quizScore,
      raceScore: schema.userCourses.raceScore,
    })
    .from(schema.userCourses)
    .where(and(eq(schema.userCourses.userId, userId), eq(schema.userCourses.courseId, courseId)))
    .limit(1)

  const row = uc[0] || {}
  const exp = Number(row.exp) || 0
  // 等级公式：50*(l-1)*l <= exp → l = floor((1 + sqrt(1 + 8*exp/100)) / 2)
  const level = Math.max(1, Math.floor((1 + Math.sqrt(1 + (8 * exp) / 100)) / 2))

  // 做题数（userQuestions 按 userId + courseId）
  const qCount = await db
    .select({ c: count() })
    .from(schema.userQuestions)
    .where(and(eq(schema.userQuestions.userId, userId), eq(schema.userQuestions.courseId, courseId)))

  // 作业提交数
  const hCount = await db
    .select({ c: count() })
    .from(schema.userHomeworks)
    .where(and(eq(schema.userHomeworks.userId, userId), eq(schema.userHomeworks.courseId, courseId)))

  // 评论数
  const cCount = await db
    .select({ c: count() })
    .from(schema.userComments)
    .where(and(eq(schema.userComments.userId, userId), eq(schema.userComments.courseId, courseId)))

  // 章节通过数：先查该课程所有章节 id，再统计 userChapters.isPass
  const chapterIds = await db
    .select({ id: schema.chapters.id })
    .from(schema.chapters)
    .where(eq(schema.chapters.courseId, courseId))
  let chapterPassCount = 0
  if (chapterIds.length > 0) {
    const passRows = await db
      .select({ c: count() })
      .from(schema.userChapters)
      .where(and(
        eq(schema.userChapters.userId, userId),
        eq(schema.userChapters.isPass, true),
        sql`${schema.userChapters.chapterId} IN (${sql.join(chapterIds.map(c => sql`${c.id}`), sql`,`)})`,
      ))
    chapterPassCount = Number(passRows[0]?.c) || 0
  }

  return {
    courseScore: Number(row.score) || 0,
    exp,
    level,
    questionScore: Number(row.questionScore) || 0,
    homeworkScore: Number(row.homeworkScore) || 0,
    commentScore: Number(row.commentScore) || 0,
    quizScore: Number(row.quizScore) || 0,
    raceScore: Number(row.raceScore) || 0,
    questionCount: Number(qCount[0]?.c) || 0,
    homeworkCount: Number(hCount[0]?.c) || 0,
    commentCount: Number(cCount[0]?.c) || 0,
    chapterPassCount,
  }
}

// ====================== 条件判定 ======================

/** 判断单个条件是否满足 */
function checkCondition(cond: MedalCondition, metrics: UserMetrics): boolean {
  const val = (metrics as any)[cond.metric]
  if (val === undefined || val === null) return false
  switch (cond.op) {
    case '>=': return val >= cond.value
    case '>': return val > cond.value
    case '<=': return val <= cond.value
    case '<': return val < cond.value
    case '==': return val === cond.value
    default: return false
  }
}

/** 判断奖章是否应该被授予 */
export function shouldAwardMedal(content: MedalContent, metrics: UserMetrics): boolean {
  if (!content.conditions || content.conditions.length === 0) return false
  if (content.logic === 'any') {
    return content.conditions.some(c => checkCondition(c, metrics))
  }
  return content.conditions.every(c => checkCondition(c, metrics))
}

// ====================== 奖章授予 ======================

/**
 * 检查并授予用户奖章
 * @returns 新授予的 medalId 数组
 */
export async function checkAndAwardMedals(userId: number, courseId: number): Promise<number[]> {
  // 获取所有未软删除的奖章
  const allMedals = await db.select().from(schema.medals).where(isNull(schema.medals.deletedAt))
  if (allMedals.length === 0) return []

  // 获取用户已有奖章
  const owned = await db
    .select({ medalId: schema.userMedals.medalId })
    .from(schema.userMedals)
    .where(eq(schema.userMedals.userId, userId))
  const ownedSet = new Set(owned.map(o => o.medalId))

  // 收集指标
  const metrics = await collectUserMetrics(userId, courseId)

  // 逐个检查未拥有的奖章
  const newMedalIds: number[] = []
  for (const medal of allMedals) {
    if (ownedSet.has(medal.id)) continue
    const content = medal.content as MedalContent
    if (!content || !content.conditions) continue
    if (shouldAwardMedal(content, metrics)) {
      await db.insert(schema.userMedals).values({ userId, medalId: medal.id })
      newMedalIds.push(medal.id)
    }
  }

  return newMedalIds
}
