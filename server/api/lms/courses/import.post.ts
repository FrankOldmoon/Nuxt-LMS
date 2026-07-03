/**
 * 课程导入：从 export API 输出的 JSON 还原课程
 * POST /api/lms/courses/import
 * body: { data: <export JSON>, categoryId?: number }
 *
 * 鉴权：仅管理员
 *
 * 还原顺序（事务内）：
 * 1. 先创建 course 拿到新 courseId（orders 先写空数组）
 * 2. 批量插入 questions → 建立 oldCid → newCid 映射
 * 3. 批量插入 homeworks / quizzes / races
 * 4. 插入 comments：先顶层后子级，parentId 用映射重写
 * 5. 插入 chapters：content 中 vue 节点引用 cid 用映射重写
 * 6. 更新 course.orders：数字 id（章节）用映射重写
 *
 * 任何一步失败整笔回滚。
 */
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

type ExportedData = {
  version: number
  exportedAt: string
  course: {
    name: string
    code?: string
    categoryId: number
    content?: any
    orders?: any[]
    gradeCriteria?: any
    tags?: any
    config?: any
  }
  chapters: Array<{
    id: number
    name: string
    code?: string
    content?: any
    tags?: any
    questionIds?: number[]
    homeworkIds?: number[]
    commentIds?: number[]
    quizIds?: number[]
    objectives?: any
    tasks?: any
    isOpen?: boolean
  }>
  questions: any[]
  homeworks: any[]
  comments: any[]
  quizzes: any[]
  races: any[]
}

export default eventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const { data, categoryId: overrideCategoryId } = body as { data: ExportedData, categoryId?: number }

  if (!data || !data.course || !Array.isArray(data.chapters)) {
    return cResp(null, '导入数据格式无效', false)
  }
  if (data.version !== 1) {
    return cResp(null, `不支持的导入版本: ${data.version}`, false)
  }

  const categoryId = overrideCategoryId || data.course.categoryId
  if (!categoryId) {
    return cResp(null, '缺少 categoryId', false)
  }

  // 校验分类存在
  const cat = await db.query.categories.findFirst({
    where: eq(schema.categories.id, categoryId),
  })
  if (!cat) return cResp(null, '分类不存在', false)

  try {
    const result = await db.transaction(async (tx) => {
      // 1. 创建 course（orders 暂时为空，待章节插入完再回填）
      const [newCourse] = await tx.insert(schema.courses).values({
        name: data.course.name,
        code: data.course.code || null,
        categoryId,
        content: data.course.content || { content: {}, type: 'doc' },
        orders: [],
        gradeCriteria: data.course.gradeCriteria || null,
        tags: data.course.tags || [],
        config: data.course.config || null,
      }).returning()
      if (!newCourse) throw new Error('课程创建失败')
      const newCourseId = newCourse.id

      // 2. questions：oldCid → newCid
      const questionMap = new Map<number, number>()
      for (const q of (data.questions || [])) {
        const { cid: oldCid, createdAt, updatedAt, ...rest } = q
        const [inserted] = await tx.insert(schema.questions).values({
          ...rest,
          courseId: newCourseId,
          cid: 0, // 由序列生成
        }).returning()
        if (inserted) questionMap.set(Number(oldCid), inserted.cid)
      }

      // 3. homeworks
      const homeworkMap = new Map<number, number>()
      for (const h of (data.homeworks || [])) {
        const { cid: oldCid, createdAt, updatedAt, ...rest } = h
        const [inserted] = await tx.insert(schema.homeworks).values({
          ...rest,
          courseId: newCourseId,
          cid: 0,
        }).returning()
        if (inserted) homeworkMap.set(Number(oldCid), inserted.cid)
      }

      // 4. quizzes
      const quizMap = new Map<number, number>()
      for (const q of (data.quizzes || [])) {
        const { cid: oldCid, createdAt, updatedAt, ...rest } = q
        const [inserted] = await tx.insert(schema.quizzes).values({
          ...rest,
          courseId: newCourseId,
          cid: 0,
        }).returning()
        if (inserted) quizMap.set(Number(oldCid), inserted.cid)
      }

      // 5. races（race 用 cids 数组，需要映射）
      const raceMap = new Map<number, number>()
      for (const r of (data.races || [])) {
        const { cid: oldCid, createdAt, updatedAt, questionIds: oldQIds, ...rest } = r
        const newQIds = Array.isArray(oldQIds)
          ? oldQIds.map((qid: any) => questionMap.get(Number(qid)) || Number(qid))
          : oldQIds
        const [inserted] = await tx.insert(schema.races).values({
          ...rest,
          courseId: newCourseId,
          cid: 0,
          questionIds: newQIds,
        }).returning()
        if (inserted) raceMap.set(Number(oldCid), inserted.cid)
      }

      // 6. comments：两遍处理（先顶层后子级）
      const allComments = (data.comments || []) as any[]
      const topLevel = allComments.filter((c) => c.parentId == null)
      const childLevel = allComments.filter((c) => c.parentId != null)

      const commentMap = new Map<number, number>()
      // 顶层
      for (const c of topLevel) {
        const { cid: oldCid, createdAt, updatedAt, ...rest } = c
        const [inserted] = await tx.insert(schema.comments).values({
          ...rest,
          courseId: newCourseId,
          cid: 0,
          parentId: null,
        }).returning()
        if (inserted) commentMap.set(Number(oldCid), inserted.cid)
      }
      // 子级：parentId 来自 commentMap
      for (const c of childLevel) {
        const { cid: oldCid, createdAt, updatedAt, parentId, ...rest } = c
        const newParentId = commentMap.get(Number(parentId)) || null
        const [inserted] = await tx.insert(schema.comments).values({
          ...rest,
          courseId: newCourseId,
          cid: 0,
          parentId: newParentId,
        }).returning()
        if (inserted) commentMap.set(Number(oldCid), inserted.cid)
      }

      // 7. chapters：content 中 vue 节点 cid 全部映射
      // 按 data.chapters 的原顺序插入，新 id 由序列生成
      // 记录「旧 chapter id → 新 chapter id」映射（用于回填 course.orders）
      const chapterIdMap = new Map<number, number>()
      for (const ch of data.chapters) {
        const oldChapterId = Number(ch.id)
        const newContent = remapContentIds(ch.content, {
          question: questionMap,
          homework: homeworkMap,
          comment: commentMap,
          quiz: quizMap,
        })
        const [inserted] = await tx.insert(schema.chapters).values({
          name: ch.name,
          code: ch.code || null,
          content: newContent,
          tags: ch.tags || [],
          questionIds: remapIdArray(ch.questionIds, questionMap),
          homeworkIds: remapIdArray(ch.homeworkIds, homeworkMap),
          commentIds: remapIdArray(ch.commentIds, commentMap),
          quizIds: remapIdArray(ch.quizIds, quizMap),
          objectives: ch.objectives || [],
          tasks: ch.tasks || [],
          courseId: newCourseId,
          isOpen: !!ch.isOpen,
        }).returning()
        if (inserted && Number.isFinite(oldChapterId) && oldChapterId > 0) {
          chapterIdMap.set(oldChapterId, inserted.id)
        }
      }

      // 8. 回填 course.orders：
      //    - 'course' 节点保持不变
      //    - 'custom-xxx' 自定义分组保持不变
      //    - 数字 id（章节）和 parentId 中的数字 id（嵌套子章节）按 chapterIdMap 重写
      const oldOrders = (data.course.orders as any[]) || []
      const remapOrderEntry = (o: any): any => {
        if (!o || typeof o !== 'object') return o
        const newItem: any = { ...o }
        // 自身的 id
        if (typeof o.id === 'string' && o.id !== 'course' && !o.id.startsWith('custom-')) {
          const n = Number(o.id)
          if (Number.isFinite(n) && n > 0 && chapterIdMap.has(n)) {
            newItem.id = String(chapterIdMap.get(n))
          }
        }
        // parentId
        if (o.parentId != null && typeof o.parentId === 'string'
          && o.parentId !== 'course' && !o.parentId.startsWith('custom-')) {
          const pn = Number(o.parentId)
          if (Number.isFinite(pn) && pn > 0 && chapterIdMap.has(pn)) {
            newItem.parentId = String(chapterIdMap.get(pn))
          }
        }
        return newItem
      }
      const newOrders = oldOrders.map(remapOrderEntry)

      await tx.update(schema.courses)
        .set({ orders: newOrders })
        .where(eq(schema.courses.id, newCourseId))

      return {
        courseId: newCourseId,
        chapters: chapterIdMap.size,
        questions: questionMap.size,
        homeworks: homeworkMap.size,
        comments: commentMap.size,
        quizzes: quizMap.size,
        races: raceMap.size,
      }
    })

    return cResp(result)
  } catch (error: any) {
    console.error('课程导入失败:', error)
    return cResp(null, error.statusMessage || error.message || '导入失败', false)
  }
})

// ====================== 辅助函数 ======================

function remapIdArray(ids: any, map: Map<number, number>): number[] {
  if (!Array.isArray(ids)) return []
  return ids
    .map((v) => map.get(Number(v)) || Number(v))
    .filter((n) => Number.isFinite(n) && n > 0)
}

/**
 * 递归遍历 Tiptap JSON，替换 vue 节点的 cid
 * node.attrs.type 决定用哪个映射
 */
function remapContentIds(content: any, maps: Record<string, Map<number, number>>): any {
  if (!content) return content
  const map = (node: any): any => {
    if (!node || typeof node !== 'object') return node
    if (node.type === 'vue' && node.attrs?.type && node.attrs?.content != null) {
      const m = maps[node.attrs.type]
      if (m) {
        const oldCid = Number(node.attrs.content)
        const newCid = m.get(oldCid)
        if (newCid != null) {
          return { ...node, attrs: { ...node.attrs, content: String(newCid) } }
        }
      }
    }
    // 递归子节点
    if (Array.isArray(node.content)) {
      return { ...node, content: node.content.map(map) }
    }
    if (node.content && typeof node.content === 'object') {
      return { ...node, content: map(node.content) }
    }
    return node
  }

  if (Array.isArray(content)) return content.map(map)
  return map(content)
}
