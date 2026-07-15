/**
 * Course import: batch insert question / homework / quiz / race
 *
 * Each function strips the `id / cid / courseId / createdAt / updatedAt / deletedAt` fields from the incoming record,
 * reassigns courseId and auto-increments cid, and maintains the oldCid → newCid mapping.
 */
import { db, schema } from '@nuxthub/db'

/** Common strip function: strips id / cid / courseId / timestamps, returns the new row + auto-incremented cid */
function splitRow(row: any) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, cid: _cid, courseId: _cId, createdAt: _ca, updatedAt: _ua, deletedAt: _da, ...rest } = row
  return rest
}

/** Common auto-increment cid inserter, iterates items to maintain oldCid → newCid mapping */
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

/** Import questions */
export async function importQuestions(tx: typeof db, items: any[], newCourseId: number) {
  return importByCidAutoIncrement(tx, schema.questions, items, newCourseId)
}

/** Import homeworks */
export async function importHomeworks(tx: typeof db, items: any[], newCourseId: number) {
  return importByCidAutoIncrement(tx, schema.homeworks, items, newCourseId)
}

/** Import quizzes */
export async function importQuizzes(tx: typeof db, items: any[], newCourseId: number) {
  return importByCidAutoIncrement(tx, schema.quizzes, items, newCourseId)
}

/**
 * Import races: race uses a cids array, questionIds needs to be rewritten using questionMap
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
