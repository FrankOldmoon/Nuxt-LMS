/**
 * 提交 API 通用记录查找
 *
 * 所有 userXxx 表的主键都是 (userId, courseId, xxxCid)，findFirst 逻辑完全一致，
 * 抽出为通用工具避免每个 submit 都重复同样的 where 构造。
 *
 * TABLES 使用惰性初始化（getter 模式），允许测试只 mock 部分 userXxx 表。
 */
import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'

export type RecordType = 'question' | 'homework' | 'quiz' | 'race'

export interface SubmitRecordTable {
  table: any
  userIdField: any
  courseIdField: any
  cidField: any
}

/** 惰性按需构造指定类型的 TABLES 视图（避免在模块加载时强制要求所有 userXxx 表都已 mock） */
function buildTable(type: RecordType): SubmitRecordTable {
  switch (type) {
    case 'question':
      return {
        table: schema.userQuestions,
        userIdField: schema.userQuestions.userId,
        courseIdField: schema.userQuestions.courseId,
        cidField: schema.userQuestions.questionCid,
      }
    case 'homework':
      return {
        table: schema.userHomeworks,
        userIdField: schema.userHomeworks.userId,
        courseIdField: schema.userHomeworks.courseId,
        cidField: schema.userHomeworks.homeworkCid,
      }
    case 'quiz':
      return {
        table: schema.userQuizzes,
        userIdField: schema.userQuizzes.userId,
        courseIdField: schema.userQuizzes.courseId,
        cidField: schema.userQuizzes.quizCid,
      }
    case 'race':
      return {
        table: schema.userRaces,
        userIdField: schema.userRaces.userId,
        courseIdField: schema.userRaces.courseId,
        cidField: schema.userRaces.raceCid,
      }
  }
}

/** 按 type 获取 db.query.<name> 引用 */
function buildQuery(type: RecordType): any {
  const map: Record<RecordType, any> = {
    question: db.query.userQuestions,
    homework: db.query.userHomeworks,
    quiz:     db.query.userQuizzes,
    race:     db.query.userRaces,
  }
  return map[type]
}

/**
 * 通用 findFirst：userId + courseId + cid 命中时返回整行，否则 null。
 *   const existing = await findUserSubmitRecord(user.id, courseId, 'question', questionCid)
 */
export async function findUserSubmitRecord(
  userId: number,
  courseId: number,
  type: RecordType,
  cid: number,
) {
  const t = buildTable(type)
  const q = buildQuery(type)
  if (!t || !q) throw new Error(`[submit] unknown record type: ${type}`)
  return q.findFirst({
    where: and(
      eq(t.userIdField, userId),
      eq(t.courseIdField, courseId),
      eq(t.cidField, cid),
    ),
  })
}

/** 同步访问 TABLES（仅用于在 submit/questions 等其它工具里以 type 分发）。注：仅当 4 张表都 mock 时可用。 */
export const SUBMIT_RECORD_TABLES: Record<RecordType, SubmitRecordTable | undefined> = new Proxy({} as any, {
  get(_target, prop: string) {
    return buildTable(prop as RecordType)
  },
})
