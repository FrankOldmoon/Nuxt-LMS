/**
 * 条件检查接口
 * POST /api/lms/condition/check
 *
 * body: { conditions: [{ type, value }] }
 * 条件类型：
 *   - role: 检查用户角色（admin/teacher/student）
 *   - class: 检查用户是否属于指定班级
 *   - question: 检查用户是否完成指定题目
 *   - homework: 检查用户是否完成指定作业
 *   - comment: 检查用户是否完成指定评论
 *
 * 返回 { met: boolean, details: [{ type, value, met }] }
 */
import { db, schema } from '@nuxthub/db'
import { eq, and } from 'drizzle-orm'

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
          // 检查用户角色
          met = user.roles.includes(cond.value)
          break

        case 'class':
          // 检查用户是否属于指定班级
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

        case 'question':
          // 检查用户是否提交过指定题目
          const qId = Number(cond.value)
          if (qId) {
            const rows = await db
              .select({ id: schema.userQuestions.id })
              .from(schema.userQuestions)
              .where(and(eq(schema.userQuestions.userId, user.id), eq(schema.userQuestions.questionId, qId)))
              .limit(1)
            met = rows.length > 0
          }
          break

        case 'homework':
          // 检查用户是否提交过指定作业
          const hId = Number(cond.value)
          if (hId) {
            const rows = await db
              .select({ id: schema.userHomeworks.id })
              .from(schema.userHomeworks)
              .where(and(eq(schema.userHomeworks.userId, user.id), eq(schema.userHomeworks.homeworkId, hId)))
              .limit(1)
            met = rows.length > 0
          }
          break

        case 'comment':
          // 检查用户是否完成指定评论（这里简化为是否发表过评论）
          const cId = Number(cond.value)
          if (cId) {
            const rows = await db
              .select({ id: schema.userComments.id })
              .from(schema.userComments)
              .where(and(eq(schema.userComments.userId, user.id), eq(schema.userComments.commentId, cId)))
              .limit(1)
            met = rows.length > 0
          }
          break

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
