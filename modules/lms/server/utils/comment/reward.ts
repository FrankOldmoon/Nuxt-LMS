/**
 * 评论奖励：发评论 / 回复 / 被点赞 的经验金币 + 章节分 + 课程分发放
 *
 * 规则（与 lms_config.comment 配置对应）：
 *  - publish:      顶层评论  publishExp / publishCoin
 *  - reply:        回复      replyExp / replyCoin
 *  - likeReceived: 被点赞    likeReceivedExp / likeReceivedCoin
 *  - 每日上限：maxDailyExp / maxDailyCoin（内存计数，防止无限刷）
 *
 * 计分：
 *  - 评论得分（commentScore）与经验值同值（exp），计入 userCourses.score（课程总分）
 *    + commentScore 分项；若提供 chapterId 同时计入 userChapters.score（章节总分）
 *  - exp / coin 照常累加
 */
import { addCourseScore } from '../userScore/course'
import { addChapterScore } from '../userScore/chapter'

// 每日累计：`${userId}:${yyyy-mm-dd}` -> { exp, coin }
const dailyCommentReward = new Map<string, { exp: number; coin: number }>()

function dayKey(userId: number): string {
  return `${userId}:${new Date().toISOString().slice(0, 10)}`
}

export type CommentRewardKind = 'publish' | 'reply' | 'likeReceived'

const EXP_KEY: Record<CommentRewardKind, string> = {
  publish: 'publishExp',
  reply: 'replyExp',
  likeReceived: 'likeReceivedExp',
}
const COIN_KEY: Record<CommentRewardKind, string> = {
  publish: 'publishCoin',
  reply: 'replyCoin',
  likeReceived: 'likeReceivedCoin',
}

/**
 * 发放一次评论奖励（受每日上限约束）
 * @param chapterId 可选，评论所在的章节（用于累加章节总分）
 * @returns 实际发放的 { exp, coin, score }
 */
export async function grantCommentReward(
  userId: number,
  courseId: number,
  kind: CommentRewardKind,
  cConfig: any,
  chapterId: number = 0,
): Promise<{ exp: number; coin: number; score: number }> {
  if (!cConfig || !courseId) return { exp: 0, coin: 0, score: 0 }

  let exp = Number(cConfig[EXP_KEY[kind]]) || 0
  let coin = Number(cConfig[COIN_KEY[kind]]) || 0
  if (exp <= 0 && coin <= 0) return { exp: 0, coin: 0, score: 0 }

  // 每日上限
  const key = dayKey(userId)
  const used = dailyCommentReward.get(key) || { exp: 0, coin: 0 }
  const maxExp = Number(cConfig.maxDailyExp) || 0
  const maxCoin = Number(cConfig.maxDailyCoin) || 0
  if (maxExp > 0) exp = Math.min(exp, Math.max(0, maxExp - used.exp))
  if (maxCoin > 0) coin = Math.min(coin, Math.max(0, maxCoin - used.coin))
  if (exp <= 0 && coin <= 0) return { exp: 0, coin: 0, score: 0 }

  // 记录当日已发
  used.exp += exp
  used.coin += coin
  dailyCommentReward.set(key, used)

  // 评论得分与经验同值：计入课程总分 + commentScore 分项 + 章节总分
  const score = exp
  await addCourseScore(userId, courseId, score, 'commentScore', exp, coin)
  if (chapterId) {
    await addChapterScore(userId, chapterId, score)
  }
  return { exp, coin, score }
}
