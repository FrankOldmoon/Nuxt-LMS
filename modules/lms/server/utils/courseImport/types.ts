/**
 * Course import / export shared types
 */
export type ExportedCourse = {
  name: string
  code?: string
  categoryId: number
  content?: any
  orders?: any[]
  gradeCriteria?: any
  tags?: any
  config?: any
}

export type ExportedChapter = {
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
}

export type ExportedData = {
  version: number
  exportedAt: string
  course: ExportedCourse
  chapters: ExportedChapter[]
  questions: any[]
  homeworks: any[]
  comments: any[]
  quizzes: any[]
  races: any[]
}

/** oldCid → newCid mapping for each type */
export type IdMaps = {
  question: Map<number, number>
  homework: Map<number, number>
  comment: Map<number, number>
  quiz: Map<number, number>
}

/** Chapter ID mapping: oldChapterId → newChapterId (used to backfill course.orders) */
export type ChapterIdMap = Map<number, number>
