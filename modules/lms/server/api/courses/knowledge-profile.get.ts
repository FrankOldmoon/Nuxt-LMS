/**
 * 课程知识能力画像：按内容标签（题目 / 作业 / 测验 / 练习 / 阅读 / 讨论）聚合学生的学习掌握度
 * GET /api/courses/knowledge-profile?courseId=1[&userId=2]
 *
 * - 不传 userId：返回当前登录学生自己的画像（学生端"知识能力画像"展示）
 * - 传 userId  且当前用户是课程教师 / 管理员：返回该学生的画像
 * - 传 userId  但权限不足：返回 403
 *
 * 掌握度口径（0~100）：
 *  - 题目：user_questions.correct_rate（缺省时用 score / point 兜底）
 *  - 作业：user_homeworks.score / homeworks.point（仅统计真实提交，record 非空）
 *  - 测验：user_quizzes.records 每题 rate 的平均值
 *  - 练习：user_races.records 每题 rate 的平均值
 *  - 阅读：user_chapters.is_pass（课程内全部章节参与，未开始记 0）
 *  - 讨论：学生参与过的评论主题占比
 *
 * 每个标签的掌握度 = 该标签下所有已产生学习行为条目的掌握度均值。
 */
import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'

const toNum = (v: any) => Number(v) || 0
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const tagList = (tags: any): string[] =>
  Array.isArray(tags) ? tags.map((t: any) => String(t).trim()).filter(Boolean) : []

/** 掌握度累加器 */
interface Acc { sum: number, weight: number, count: number, sources: Set<string> }

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const courseId = Number(getQuery(event).courseId)
  if (!courseId) return cResp(null, '缺少 courseId', false)

  const queryUserId = Number(getQuery(event).userId) || 0
  let uid = user.id
  if (queryUserId && queryUserId !== user.id) {
    // 仅课程教师 / 管理员可查看其他学生的画像
    const isTeacher = await isCourseTeacher(user.id, courseId)
    if (!isTeacher && !user.roles?.includes('admin')) {
      throw createError({ statusCode: 403, statusMessage: '无权查看该学生的画像' })
    }
    uid = queryUserId
  }

  // 课程内容（含标签）：作为画像的"知识点"来源
  const [questions, homeworks, quizzes, races, comments, chapters] = await Promise.all([
    db.select({ cid: schema.questions.cid, tags: schema.questions.tags, point: schema.questions.point })
      .from(schema.questions).where(eq(schema.questions.courseId, courseId)),
    db.select({ cid: schema.homeworks.cid, tags: schema.homeworks.tags, point: schema.homeworks.point })
      .from(schema.homeworks).where(eq(schema.homeworks.courseId, courseId)),
    db.select({ cid: schema.quizzes.cid, tags: schema.quizzes.tags })
      .from(schema.quizzes).where(eq(schema.quizzes.courseId, courseId)),
    db.select({ cid: schema.races.cid, tags: schema.races.tags })
      .from(schema.races).where(eq(schema.races.courseId, courseId)),
    db.select({ cid: schema.comments.cid, parentId: schema.comments.parentId, userId: schema.comments.userId, tags: schema.comments.tags })
      .from(schema.comments).where(eq(schema.comments.courseId, courseId)),
    db.select({ id: schema.chapters.id, tags: schema.chapters.tags })
      .from(schema.chapters).where(eq(schema.chapters.courseId, courseId)),
  ])

  // 学生在该课程的学习行为
  const [userQuestions, userHomeworks, userQuizzes, userRaces, userChapters] = await Promise.all([
    db.select({ cid: schema.userQuestions.questionCid, score: schema.userQuestions.score, rate: schema.userQuestions.correctRate })
      .from(schema.userQuestions).where(and(eq(schema.userQuestions.courseId, courseId), eq(schema.userQuestions.userId, uid))),
    db.select({ cid: schema.userHomeworks.homeworkCid, score: schema.userHomeworks.score, record: schema.userHomeworks.record })
      .from(schema.userHomeworks).where(and(eq(schema.userHomeworks.courseId, courseId), eq(schema.userHomeworks.userId, uid))),
    db.select({ cid: schema.userQuizzes.quizCid, records: schema.userQuizzes.records })
      .from(schema.userQuizzes).where(and(eq(schema.userQuizzes.courseId, courseId), eq(schema.userQuizzes.userId, uid))),
    db.select({ cid: schema.userRaces.raceCid, records: schema.userRaces.records })
      .from(schema.userRaces).where(and(eq(schema.userRaces.courseId, courseId), eq(schema.userRaces.userId, uid))),
    db.select({ chapterId: schema.userChapters.chapterId, isPass: schema.userChapters.isPass })
      .from(schema.userChapters).where(eq(schema.userChapters.userId, uid)),
  ])

  // ====================== 标签 / 维度累加 ======================
  const tagMap = new Map<string, Acc>()
  const addTag = (tag: string, value: number, source: string) => {
    let acc = tagMap.get(tag)
    if (!acc) {
      acc = { sum: 0, weight: 0, count: 0, sources: new Set() }
      tagMap.set(tag, acc)
    }
    acc.sum += clamp01(value)
    acc.weight += 1
    acc.count += 1
    acc.sources.add(source)
  }

  type DimKey = 'question' | 'homework' | 'quiz' | 'practice' | 'reading' | 'comment'
  const dim: Record<DimKey, { sum: number, weight: number, count: number }> = {
    question: { sum: 0, weight: 0, count: 0 },
    homework: { sum: 0, weight: 0, count: 0 },
    quiz: { sum: 0, weight: 0, count: 0 },
    practice: { sum: 0, weight: 0, count: 0 },
    reading: { sum: 0, weight: 0, count: 0 },
    comment: { sum: 0, weight: 0, count: 0 },
  }
  const addDim = (key: DimKey, value: number) => {
    dim[key].sum += clamp01(value)
    dim[key].weight += 1
    dim[key].count += 1
  }

  // 1) 题目
  const questionMap = new Map(questions.map(q => [toNum(q.cid), q]))
  for (const uq of userQuestions) {
    const q = questionMap.get(toNum(uq.cid))
    if (!q) continue
    const point = toNum(q.point)
    const rate = uq.rate != null ? toNum(uq.rate) : (point > 0 ? toNum(uq.score) / point : 0)
    addDim('question', rate)
    for (const tag of tagList(q.tags)) addTag(tag, rate, 'question')
  }

  // 2) 作业（仅真实提交）
  const homeworkMap = new Map(homeworks.map(h => [toNum(h.cid), h]))
  for (const uh of userHomeworks) {
    if (uh.record == null) continue
    const h = homeworkMap.get(toNum(uh.cid))
    if (!h) continue
    const point = toNum(h.point)
    const ratio = point > 0 ? toNum(uh.score) / point : 0
    addDim('homework', ratio)
    for (const tag of tagList(h.tags)) addTag(tag, ratio, 'homework')
  }

  // 3) 测验（逐题 rate 均值）
  const quizMap = new Map(quizzes.map(q => [toNum(q.cid), q]))
  for (const uqz of userQuizzes) {
    const qz = quizMap.get(toNum(uqz.cid))
    if (!qz) continue
    const records = Array.isArray(uqz.records) ? uqz.records : []
    const ratio = records.length
      ? records.reduce((s: number, r: any) => s + clamp01(toNum(r?.rate)), 0) / records.length
      : 0
    addDim('quiz', ratio)
    for (const tag of tagList(qz.tags)) addTag(tag, ratio, 'quiz')
  }

  // 4) 练习（抢答竞赛，逐题 rate 均值）
  const raceMap = new Map(races.map(r => [toNum(r.cid), r]))
  for (const ur of userRaces) {
    const race = raceMap.get(toNum(ur.cid))
    if (!race) continue
    const records = Array.isArray(ur.records) ? ur.records : []
    const ratio = records.length
      ? records.reduce((s: number, r: any) => s + clamp01(toNum(r?.rate)), 0) / records.length
      : 0
    addDim('practice', ratio)
    for (const tag of tagList(race.tags)) addTag(tag, ratio, 'practice')
  }

  // 5) 阅读（课程内全部章节参与计算，未开始记 0）
  const userChapterMap = new Map(userChapters.map(uc => [toNum(uc.chapterId), uc]))
  for (const ch of chapters) {
    const uc = userChapterMap.get(toNum(ch.id))
    const value = uc?.isPass ? 1 : 0
    addDim('reading', value)
    for (const tag of tagList(ch.tags)) addTag(tag, value, 'reading')
  }

  // 6) 讨论（学生参与过的评论主题占比）
  const commentByCid = new Map(comments.map(c => [toNum(c.cid), c]))
  const resolveTopic = (cid: number): number => {
    let cur = commentByCid.get(cid)
    let guard = 0
    while (cur && cur.parentId != null && guard++ < 50) {
      const parent = commentByCid.get(toNum(cur.parentId))
      if (!parent) break
      cur = parent
    }
    return cur ? toNum(cur.cid) : cid
  }
  const rootTopics = comments.filter(c => c.parentId == null)
  const myTopics = new Set<number>()
  for (const c of comments) {
    if (toNum(c.userId) !== uid) continue
    myTopics.add(resolveTopic(toNum(c.cid)))
  }
  if (rootTopics.length > 0) {
    addDim('comment', myTopics.size / rootTopics.length)
    for (const topicCid of myTopics) {
      const topic = commentByCid.get(topicCid)
      if (!topic) continue
      for (const tag of tagList(topic.tags)) addTag(tag, 1, 'comment')
    }
  }

  // ====================== 汇总输出 ======================
  const dimensions = (Object.keys(dim) as DimKey[]).map(key => ({
    key,
    value: dim[key].weight > 0 ? Math.round((dim[key].sum / dim[key].weight) * 100) : 0,
    count: dim[key].count,
  }))

  const tags = [...tagMap.entries()]
    .map(([tag, acc]) => ({
      tag,
      mastery: acc.weight > 0 ? Math.round((acc.sum / acc.weight) * 100) : 0,
      count: acc.count,
      sources: [...acc.sources],
    }))
    .sort((a, b) => b.mastery - a.mastery)

  const strengths = tags.filter(t => t.mastery >= 60).slice(0, 3).map(t => t.tag)
  const weaknesses = [...tags].sort((a, b) => a.mastery - b.mastery)
    .filter(t => t.mastery < 60).slice(0, 3).map(t => t.tag)

  const scored = dimensions.filter(d => d.count > 0).map(d => d.value)
  const overall = scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : 0

  return cResp({
    dimensions,
    tags,
    strengths,
    weaknesses,
    overall,
    taggedCount: tags.length,
  })
})
