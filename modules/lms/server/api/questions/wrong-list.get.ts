import { db, schema } from "@nuxthub/db"
import { and, eq, gt, sql, desc } from "drizzle-orm"

/**
 * Wrong questions list (paginated)
 * Reads questions the current user answered wrong (user_questions.wrongCount > 0),
 * joined with the questions table to return full question data.
 *
 * Query: course_id, page?, pageSize?
 * - No course_id: returns wrong questions from all of the user's courses
 * - With course_id: returns wrong questions from that course only
 */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const { course_id, page, pageSize, keyword, type } = getQuery(event)
  const cid = course_id ? Number(course_id) : 0
  const pageNum = Math.max(1, Number(page) || 1)
  const size = Math.min(100, Math.max(1, Number(pageSize) || 10))
  const offset = (pageNum - 1) * size

  try {
    // Build base query conditions
    const conditions: any[] = [
      eq(schema.userQuestions.userId, user.id),
      gt(schema.userQuestions.wrongCount, 0),
    ]
    if (cid) {
      conditions.push(eq(schema.userQuestions.courseId, cid))
    }

    const whereClause = and(...conditions)

    // 1. Count total
    const totalResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.userQuestions)
      .where(whereClause)
    const total = totalResult[0]?.count || 0

    // 2. Fetch wrong question records from user_questions (ordered by most recent wrong answer desc)
    const wrongRows = await db
      .select({
        courseId: schema.userQuestions.courseId,
        questionCid: schema.userQuestions.questionCid,
        wrongCount: schema.userQuestions.wrongCount,
        submitCount: schema.userQuestions.submitCount,
        firstRight: schema.userQuestions.firstRight,
        updatedAt: schema.userQuestions.updatedAt,
      })
      .from(schema.userQuestions)
      .where(whereClause)
      .orderBy(desc(schema.userQuestions.updatedAt))
      .limit(size)
      .offset(offset)

    if (wrongRows.length === 0) {
      return cResp({ items: [], total: 0, page: pageNum, pageSize: size })
    }

    // 3. Join with questions to fetch full question details in one go
    const courseIds = [...new Set(wrongRows.map(r => r.courseId))]
    const questionCids = [...new Set(wrongRows.map(r => r.questionCid))]

    // drizzle doesn't support composite inArray, query by courseId first and filter in memory
    const questionRows = await db.query.questions.findMany({
      where: (q, { inArray, and: andOp, eq: eqOp }) => andOp(
        inArray(q.courseId, courseIds),
        inArray(q.cid, questionCids),
      ),
    })

    // 4. Merge + filter by keyword/question type
    const questionMap = new Map(
      questionRows.map(q => [`${q.courseId}-${q.cid}`, q])
    )

    const kw = (keyword ? String(keyword) : '').trim().toLowerCase()
    const typeFilter = type ? String(type) : ''

    const items = wrongRows
      .map(w => {
        const q = questionMap.get(`${w.courseId}-${w.questionCid}`)
        if (!q) return null
        return {
          ...q,
          wrongCount: w.wrongCount,
          submitCount: w.submitCount,
          firstRight: w.firstRight,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .filter(x => {
        if (typeFilter && x.type !== typeFilter) return false
        if (kw) {
          const name = (x.name || '').toLowerCase()
          const cid = String(x.cid)
          if (!name.includes(kw) && !cid.includes(kw)) return false
        }
        return true
      })

    return cResp({ items, total, page: pageNum, pageSize: size })
  } catch (error: any) {
    console.error('Failed to query wrong questions:', error)
    return cResp(null, error.message || 'Failed to query wrong questions', false)
  }
})
