/**
 * 提交竞赛成绩
 * POST /api/races/submit
 * body: { course_id, race_cid, records, total_score }
 * records: [{ questionCid, rate, point, answer }]
 *
 * 判分安全：total_score / rate / point 均不信任客户端。
 * 服务端加载竞赛题目定义，根据 records[].answer 重算每题得分比，point 取 DB 值，
 * 且只统计属于该竞赛（races.questionIds）的题目。
 *
 * 防刷策略（详见 utils/submit/race.ts）：
 *  - 已有记录：取最高分（不累加），不再给经验
 *  - 首次提交：给参与经验（participateExp）
 */
import { db, schema } from '@nuxthub/db'
import { and, eq, inArray } from 'drizzle-orm'
import { parseSubmitContext, SubmitContextError } from '../../utils/submit/context'
import { findUserSubmitRecord } from '../../utils/submit/record'
import { notifyCourseProgressMax, notifyParentCourse } from '../../utils/submit/progress'
import { withSubmitHandler } from '../../utils/submit/handler'
import { computeServerRate } from '../../utils/submit/verify'

export default withSubmitHandler('提交竞赛成绩失败', async (event) => {
  const ctx = await parseSubmitContext(event, {
    cidField: 'race_cid',
    sectionKey: 'race',
  })
  const { user, courseId, cid: raceCid, section: rConfig, body } = ctx

  const records = Array.isArray(body.records) ? body.records : []

  // 1. 加载竞赛定义（questionIds 白名单）
  const race = await db.query.races.findFirst({
    where: and(eq(schema.races.courseId, courseId), eq(schema.races.cid, raceCid)),
  })
  if (!race) {
    throw new SubmitContextError('竞赛不存在')
  }
  const questionIds: number[] = (Array.isArray(race.questionIds) ? race.questionIds : []).map(Number)

  // 2. 加载竞赛题目，服务端重算成绩
  const raceQuestions = questionIds.length
    ? await db.query.questions.findMany({
        where: and(
          eq(schema.questions.courseId, courseId),
          inArray(schema.questions.cid, questionIds),
        ),
      })
    : []
  const questionMap = new Map(raceQuestions.map(q => [Number(q.cid), q]))

  let verifiedScore = 0
  const verifiedRecords = records
    .filter((r: any) => r && questionMap.has(Number(r.questionCid)))
    .map((r: any) => {
      const q = questionMap.get(Number(r.questionCid))!
      const rate = computeServerRate(q, r.answer)
      const point = Number(q.point) || 0
      verifiedScore += rate * point
      return { ...r, rate, point }
    })
  const score = Math.round(verifiedScore * 100) / 100

  const participationExp = rConfig.participateExp || rConfig.participationExp || 0
  const participationCoin = rConfig.participateCoin || rConfig.participationCoin || 0

  // 1. 查找已有记录
  const existing = await findUserSubmitRecord(user.id, courseId, 'race', raceCid)
  const prevScore = Number(existing?.score) || 0
  const bestScore = Math.max(prevScore, score)
  const isFirstSubmit = !existing
  const gainedExp = isFirstSubmit ? participationExp : 0
  const gainedCoin = isFirstSubmit ? participationCoin : 0

  // 2. 写 userRaces（取最高分，records 存服务端重算后的版本）
  if (existing) {
    await db.update(schema.userRaces).set({
      records: verifiedRecords,
      score: String(bestScore),
    }).where(and(
      eq(schema.userRaces.userId, user.id),
      eq(schema.userRaces.courseId, courseId),
      eq(schema.userRaces.raceCid, raceCid),
    ))
  } else {
    await db.insert(schema.userRaces).values({
      userId: user.id,
      courseId,
      raceCid,
      records: verifiedRecords,
      score: String(score),
    })
  }

  // 3. 更新 userCourses.questionScore（竞赛分数计入做题分，最高分模式 + 参与经验）
  await notifyCourseProgressMax({
    userId: user.id,
    courseId,
    score: bestScore,
    scoreKey: 'questionScore',
    exp: gainedExp,
    coin: gainedCoin,
  })

  // 3.25 竞赛提交章节分（可调参数 race.chapterScore）
  // 防刷：竞赛无提交次数限制，章节分仅在首次提交时发放一次，防止循环提交无限刷章节分；
  // chapter_id 必须属于本课程，防止跨课程章节分注入。
  const chapterId = Number(ctx.body.chapter_id) || 0
  const raceChapterScore = Number(rConfig.chapterScore) || 0
  if (chapterId && raceChapterScore > 0 && isFirstSubmit) {
    const chapter = await db.query.chapters.findFirst({
      where: and(eq(schema.chapters.id, chapterId), eq(schema.chapters.courseId, courseId)),
    })
    if (chapter) {
      await addChapterScore(user.id, chapterId, raceChapterScore)
    }
  }

  // 3.5 被其他课程 iframe 嵌入时，将相同加分镜像给宿主课程
  const parentCourseId = Number(body.parent_course_id) || 0
  if (parentCourseId && parentCourseId !== courseId) {
    await notifyParentCourse({
      userId: user.id,
      parentCourseId,
      selfCourseId: courseId,
      score: bestScore,
      scoreKey: 'questionScore',
      exp: gainedExp,
      coin: gainedCoin,
      mode: 'max',
    })
  }

  return cResp({ gainedExp, gainedCoin, score })
})
