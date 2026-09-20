import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

/**
 * 课程 3D「知识星系」只读数据源
 * GET /api/courses/galaxy?courseId=1
 *
 * 面向所有登录用户（学生也能看），返回该课程的结构化概览：
 *   - course  ：课程标题 + 课程标签
 *   - chapters：章节（按课程目录 orders 排序）+ 每章标签 + 当前用户是否通过
 *   - tags    ：全课程标签目录（课程/章节/题目/作业/测验/练习/讨论 聚合，含出现次数与来源）
 *   - totals  ：章节数 / 标签数 / 内容条目数
 *
 * 说明：章节 tags 与内容 tags 在常规课程接口里不下发，这里统一聚合，供 3D 星系渲染。
 */

const tagList = (tags: any): string[] =>
  Array.isArray(tags) ? tags.map((t: any) => String(t).trim()).filter(Boolean) : []

/** 按课程目录 orders 给章节排序；orders 缺失时按 id 升序 */
function orderChapters<T extends { id: number }>(chapters: T[], orders: any): T[] {
  const list = Array.isArray(orders) ? orders : []
  const orderMap = new Map<string, number>()
  list.forEach((o: any, idx: number) => {
    if (o && o.id != null) orderMap.set(String(o.id), Number(o.order ?? idx))
  })
  return [...chapters].sort((a, b) => {
    const ao = orderMap.has(String(a.id)) ? orderMap.get(String(a.id))! : Number.MAX_SAFE_INTEGER
    const bo = orderMap.has(String(b.id)) ? orderMap.get(String(b.id))! : Number.MAX_SAFE_INTEGER
    return ao - bo || a.id - b.id
  })
}

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const courseId = Number(getQuery(event).courseId || 0)
  if (!courseId) return cResp(null, '缺少 courseId', false)

  const course = await db.query.courses.findFirst({ where: eq(schema.courses.id, courseId) })
  if (!course) return cResp(null, '课程不存在', false)

  const [chapters, questions, homeworks, quizzes, races, comments, userChapters] = await Promise.all([
    db.select({ id: schema.chapters.id, name: schema.chapters.name, tags: schema.chapters.tags, isOpen: schema.chapters.isOpen })
      .from(schema.chapters).where(eq(schema.chapters.courseId, courseId)),
    db.select({ tags: schema.questions.tags }).from(schema.questions).where(eq(schema.questions.courseId, courseId)),
    db.select({ tags: schema.homeworks.tags }).from(schema.homeworks).where(eq(schema.homeworks.courseId, courseId)),
    db.select({ tags: schema.quizzes.tags }).from(schema.quizzes).where(eq(schema.quizzes.courseId, courseId)),
    db.select({ tags: schema.races.tags }).from(schema.races).where(eq(schema.races.courseId, courseId)),
    db.select({ tags: schema.comments.tags }).from(schema.comments).where(eq(schema.comments.courseId, courseId)),
    db.select({ chapterId: schema.userChapters.chapterId, isPass: schema.userChapters.isPass })
      .from(schema.userChapters).where(eq(schema.userChapters.userId, user.id)),
  ])

  const passMap = new Map(userChapters.map(uc => [Number(uc.chapterId), uc.isPass === true]))

  // 标签目录：tag → { count, sources }
  const tagMap = new Map<string, { count: number, sources: Set<string> }>()
  const addTags = (tags: any, source: string) => {
    for (const tag of tagList(tags)) {
      let acc = tagMap.get(tag)
      if (!acc) { acc = { count: 0, sources: new Set() }; tagMap.set(tag, acc) }
      acc.count += 1
      acc.sources.add(source)
    }
  }
  addTags(course.tags, 'course')
  for (const ch of chapters) addTags(ch.tags, 'reading')
  for (const q of questions) addTags(q.tags, 'question')
  for (const h of homeworks) addTags(h.tags, 'homework')
  for (const z of quizzes) addTags(z.tags, 'quiz')
  for (const r of races) addTags(r.tags, 'practice')
  for (const c of comments) addTags(c.tags, 'comment')

  const tags = [...tagMap.entries()]
    .map(([tag, acc]) => ({ tag, count: acc.count, sources: [...acc.sources] }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))

  const ordered = orderChapters(chapters, course.orders)

  return cResp({
    course: { id: course.id, title: course.name, tags: tagList(course.tags) },
    chapters: ordered.map(ch => ({
      id: Number(ch.id),
      title: ch.name,
      isOpen: !!ch.isOpen,
      isPass: passMap.get(Number(ch.id)) === true,
      tags: tagList(ch.tags),
    })),
    tags,
    totals: {
      chapters: chapters.length,
      tags: tags.length,
      contents: questions.length + homeworks.length + quizzes.length + races.length + comments.length,
    },
  })
})
