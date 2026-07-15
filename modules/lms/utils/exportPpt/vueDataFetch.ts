/**
 * Vue extension node (quiz/homework/race) data pre-fetching
 *
 * These vue types reference backend data via cid, and need to be pre-fetched in parallel before rendering:
 *  - quiz:     /api/quizzes/show?course_id=X&cid=Y
 *  - homework: /api/homeworks/show?course_id=X&cid=Y
 *  - race:     /api/races/show?course_id=X&cid=Y
 *
 * After pre-fetching, nested question cids within quiz/race are extracted and merged into questionCids (coordinated by index.ts)
 */

/** Recursively collect cids of all vue quiz/homework/race nodes */
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
      // Only collect when cid is a string/number; object type is inline data, no API needed
      if (c != null && typeof c !== 'object') {
        const cid = Number(c)
        if (cid > 0) {
          if (vueType === 'quiz' && !quizCids.includes(cid)) quizCids.push(cid)
          else if (vueType === 'homework' && !homeworkCids.includes(cid)) homeworkCids.push(cid)
          else if (vueType === 'race' && !raceCids.includes(cid)) raceCids.push(cid)
        }
      }
    }
    // Recursively scan child nodes
    if (Array.isArray(node.content)) {
      collectVueContentCids(node.content, quizCids, homeworkCids, raceCids)
    }
  }
}

/** Extract nested question cids from quiz data */
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

/** Extract nested question cids from race data */
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

/** Parallel pre-fetch quiz/homework/race data, write to corresponding cache */
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
      } catch { /* Silently ignored */ }
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
      } catch { /* Silently ignored */ }
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
      } catch { /* Silently ignored */ }
    })())
  }

  await Promise.all(tasks)
}
