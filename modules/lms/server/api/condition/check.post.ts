/**
 * 条件检查接口
 * POST /api/condition/check
 *
 * body: { conditions: [{ type, value }] }
 * 条件类型：
 *   - role: 检查用户角色（admin/teacher/student）
 *   - class: 检查用户是否属于指定班级
 *   - question: 检查用户是否完成指定题目（value 为 cid 数组，需全部完成）
 *   - homework: 检查用户是否完成指定作业（value 为 cid 数组，需全部完成）
 *   - comment: 检查用户是否完成指定评论（value 为 cid 数组，需全部完成）
 *   - quiz: 检查用户是否完成指定测验（value 为 cid 数组，需全部完成）
 *   - race: 检查用户是否完成指定竞速（value 为 cid 数组，需全部完成）
 *
 * 返回 { met: boolean, details: [{ type, value, met }] }
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, inArray } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const conditions = body.conditions

  if (!Array.isArray(conditions) || !conditions.length) {
    return cResp({ met: true, details: [] }, '无条件，默认满足')
  }

  const details = []
  let allMet = true

  for (const cond of conditions) {
    let met = false

    try {
      switch (cond.type) {
        case 'role':
          // teacher 条件 admin 也能通过（与客户端 render.vue 保持一致）
          met = user.roles.includes(cond.value)
            || (cond.value === 'teacher' && user.roles.includes('admin'))
          break

        case 'class': {
          const classId = Number(cond.value)
          if (classId) {
            const rows = await db
              .select({ id: schema.userClasses.userId })
              .from(schema.userClasses)
              .where(and(eq(schema.userClasses.userId, user.id), eq(schema.userClasses.classId, classId)))
              .limit(1)
            met = rows.length > 0
          }
          break
        }

        case 'question': {
          // 多选：value 为 cid 数组，需全部完成
          const qIds = Array.isArray(cond.value)
            ? cond.value.map(Number).filter(Boolean)
            : [Number(cond.value)].filter(Boolean)
          if (qIds.length > 0) {
            const rows = await db
              .select({ questionCid: schema.userQuestions.questionCid })
              .from(schema.userQuestions)
              .where(and(eq(schema.userQuestions.userId, user.id), inArray(schema.userQuestions.questionCid, qIds)))
            const doneSet = new Set(rows.map(r => r.questionCid))
            met = qIds.every((id: number) => doneSet.has(id))
          }
          break
        }

        case 'homework': {
          const hIds = Array.isArray(cond.value)
            ? cond.value.map(Number).filter(Boolean)
            : [Number(cond.value)].filter(Boolean)
          if (hIds.length > 0) {
            const rows = await db
              .select({ homeworkCid: schema.userHomeworks.homeworkCid })
              .from(schema.userHomeworks)
              .where(and(eq(schema.userHomeworks.userId, user.id), inArray(schema.userHomeworks.homeworkCid, hIds)))
            const doneSet = new Set(rows.map(r => r.homeworkCid))
            met = hIds.every((id: number) => doneSet.has(id))
          }
          break
        }

        case 'comment': {
          const cIds = Array.isArray(cond.value)
            ? cond.value.map(Number).filter(Boolean)
            : [Number(cond.value)].filter(Boolean)
          if (cIds.length > 0) {
            const rows = await db
              .select({ commentCid: schema.userComments.commentCid })
              .from(schema.userComments)
              .where(and(eq(schema.userComments.userId, user.id), inArray(schema.userComments.commentCid, cIds)))
            const doneSet = new Set(rows.map(r => r.commentCid))
            met = cIds.every((id: number) => doneSet.has(id))
          }
          break
        }

        case 'quiz': {
          const qIds = Array.isArray(cond.value)
            ? cond.value.map(Number).filter(Boolean)
            : [Number(cond.value)].filter(Boolean)
          if (qIds.length > 0) {
            const rows = await db
              .select({ quizCid: schema.userQuizzes.quizCid })
              .from(schema.userQuizzes)
              .where(and(eq(schema.userQuizzes.userId, user.id), inArray(schema.userQuizzes.quizCid, qIds)))
            const doneSet = new Set(rows.map(r => r.quizCid))
            met = qIds.every((id: number) => doneSet.has(id))
          }
          break
        }

        case 'race': {
          const rIds = Array.isArray(cond.value)
            ? cond.value.map(Number).filter(Boolean)
            : [Number(cond.value)].filter(Boolean)
          if (rIds.length > 0) {
            const rows = await db
              .select({ raceCid: schema.userRaces.raceCid })
              .from(schema.userRaces)
              .where(and(eq(schema.userRaces.userId, user.id), inArray(schema.userRaces.raceCid, rIds)))
            const doneSet = new Set(rows.map(r => r.raceCid))
            met = rIds.every((id: number) => doneSet.has(id))
          }
          break
        }

        default:
          met = false
      }
    } catch (e) {
      console.error('[condition] 检查失败', cond, e)
      met = false
    }

    if (!met) allMet = false
    details.push({ type: cond.type, value: cond.value, met })
  }

  return cResp({ met: allMet, details })
})
