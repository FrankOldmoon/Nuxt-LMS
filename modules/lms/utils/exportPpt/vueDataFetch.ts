/**
 * Vue 扩展节点（quiz/homework/race）数据预取
 *
 * 这些 vue 类型通过 cid 引用后端数据，需在渲染前并行预取：
 *  - quiz:     /api/quizzes/show?course_id=X&cid=Y
 *  - homework: /api/homeworks/show?course_id=X&cid=Y
 *  - race:     /api/races/show?course_id=X&cid=Y
 *
 * 预取后，quiz/race 中的嵌套题目 cid 会被提取并合并到 questionCids（由 index.ts 协调）
 */

/** 递归收集所有 vue quiz/homework/race 节点的 cid */
export function collectVueContentCids(
  nodes: any[],
  quizCids: number[],
  homeworkCids: number[],
  raceCids: number[],
): void {
  for (const node of nodes || []) {
    if (!node) continue
    if (node.type === 'vue') {
      const vueType = node.attrs?.type
      const c = node.attrs?.content
      // cid 为字符串/数字时才收集；对象类型是内联数据，无需 API
      if (c != null && typeof c !== 'object') {
        const cid = Number(c)
        if (cid > 0) {
          if (vueType === 'quiz' && !quizCids.includes(cid)) quizCids.push(cid)
          else if (vueType === 'homework' && !homeworkCids.includes(cid)) homeworkCids.push(cid)
          else if (vueType === 'race' && !raceCids.includes(cid)) raceCids.push(cid)
        }
      }
    }
    // 递归扫描子节点
    if (Array.isArray(node.content)) {
      collectVueContentCids(node.content, quizCids, homeworkCids, raceCids)
    }
  }
}

/** 从 quiz 数据中提取嵌套题目 cid */
export function extractQuizQuestionCids(quiz: any): number[] {
  const cids: number[] = []
  const questions = quiz?.questions
  if (!Array.isArray(questions)) return cids
  for (const q of questions) {
    const qid = typeof q === 'number' ? q : Number(q?.id)
    if (qid > 0 && !cids.includes(qid)) cids.push(qid)
  }
  return cids
}

/** 从 race 数据中提取嵌套题目 cid */
export function extractRaceQuestionCids(race: any): number[] {
  const cids: number[] = []
  const questionIds = race?.questionIds
  if (!Array.isArray(questionIds)) return cids
  for (const qid of questionIds) {
    const n = Number(qid)
    if (n > 0 && !cids.includes(n)) cids.push(n)
  }
  return cids
}

/** 并行预取 quiz/homework/race 数据，写入对应 cache */
export async function fetchVueContent(
  courseId: number,
  quizCids: number[],
  homeworkCids: number[],
  raceCids: number[],
  quizCache: Map<number, any>,
  homeworkCache: Map<number, any>,
  raceCache: Map<number, any>,
): Promise<void> {
  if (!courseId) return

  const tasks: Promise<void>[] = []

  for (const cid of quizCids) {
    tasks.push((async () => {
      try {
        const resp = await $fetch<{ data: any; success: boolean; msg: string }>(
          `/api/quizzes/show?course_id=${courseId}&cid=${cid}`,
        )
        if (resp?.success && resp.data) {
          quizCache.set(cid, resp.data)
        }
      } catch { /* 静默忽略 */ }
    })())
  }

  for (const cid of homeworkCids) {
    tasks.push((async () => {
      try {
        const resp = await $fetch<{ data: any; success: boolean; msg: string }>(
          `/api/homeworks/show?course_id=${courseId}&cid=${cid}`,
        )
        if (resp?.success && resp.data) {
          homeworkCache.set(cid, resp.data)
        }
      } catch { /* 静默忽略 */ }
    })())
  }

  for (const cid of raceCids) {
    tasks.push((async () => {
      try {
        const resp = await $fetch<{ data: any; success: boolean; msg: string }>(
          `/api/races/show?course_id=${courseId}&cid=${cid}`,
        )
        if (resp?.success && resp.data) {
          raceCache.set(cid, resp.data)
        }
      } catch { /* 静默忽略 */ }
    })())
  }

  await Promise.all(tasks)
}
