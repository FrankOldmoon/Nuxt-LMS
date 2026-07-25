/**
 * 课程导入：批量插入 question / homework / quiz / race
 *
 * 每个函数都把传入记录的 `id / cid / courseId / createdAt / updatedAt / deletedAt` 字段剥离，
 * 重新分配 courseId 和自增 cid，并维护 oldCid → newCid 的映射。
 */
import { db, schema } from '@nuxthub/db'

/** 通用剥离函数：剥离 id / cid / courseId / 时间戳，返回新行 + 自增 cid */
function splitRow(row: any) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, cid: _cid, courseId: _cId, createdAt: _ca, updatedAt: _ua, deletedAt: _da, ...rest } = row
  return rest
}

/** 通用自增 cid 插入器，遍历 items 维护 oldCid → newCid 映射 */
async function importByCidAutoIncrement(
  tx: typeof db,
  table: any,
  items: any[],
  newCourseId: number,
): Promise<Map<number, number>> {
  const map = new Map<number, number>()
  let nextCid = 0
  for (const item of (items || [])) {
    nextCid++
    const rest = splitRow(item)
    const [inserted] = await tx.insert(table).values({
      ...rest,
      courseId: newCourseId,
      cid: nextCid,
    }).returning()
    if (inserted) map.set(Number(item.cid), inserted.cid)
  }
  return map
}

/** 导入题目 */
export async function importQuestions(tx: typeof db, items: any[], newCourseId: number) {
  return importByCidAutoIncrement(tx, schema.questions, items, newCourseId)
}

/** 导入作业 */
export async function importHomeworks(tx: typeof db, items: any[], newCourseId: number) {
  return importByCidAutoIncrement(tx, schema.homeworks, items, newCourseId)
}

/** 导入测验 */
export async function importQuizzes(tx: typeof db, items: any[], newCourseId: number) {
  return importByCidAutoIncrement(tx, schema.quizzes, items, newCourseId)
}

/**
 * 导入竞速：race 用 cids 数组，需要将 questionIds 用 questionMap 重写
 */
export async function importRaces(
  tx: typeof db,
  items: any[],
  newCourseId: number,
  questionMap: Map<number, number>,
): Promise<Map<number, number>> {
  const map = new Map<number, number>()
  let nextCid = 0
  for (const item of (items || [])) {
    nextCid++
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, cid: _cid, courseId: _cId, createdAt: _ca, updatedAt: _ua, deletedAt: _da, questionIds: oldQIds, ...rest } = item
    const newQIds = Array.isArray(oldQIds)
      ? oldQIds.map((qid: any) => questionMap.get(Number(qid)) || Number(qid))
      : oldQIds
    const [inserted] = await tx.insert(schema.races).values({
      ...rest,
      courseId: newCourseId,
      cid: nextCid,
      questionIds: newQIds,
    }).returning()
    if (inserted) map.set(Number(item.cid), inserted.cid)
  }
  return map
}
