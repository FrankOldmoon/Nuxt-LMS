// ====================== Type definitions ======================

/** Medal condition: a metric reaches a certain value */
export interface MedalCondition {
  /** Metric name: courseScore / exp / level / questionScore / homeworkScore / commentScore / quizScore / raceScore / questionCount / homeworkCount / commentCount / chapterPassCount */
  metric: string
  /** Operator: >= / > / <= / < / == */
  op: string
  /** Threshold value */
  value: number
}

/** Medal configuration (stored in medals.content) */
export interface MedalContent {
  /** Icon name (lucide) */
  icon: string
  /** Color: bronze / silver / gold / diamond / primary / success / warning / error / info */
  color: string
  /** Tier: 1=Bronze 2=Silver 3=Gold 4=Diamond */
  tier: number
  /** Description */
  description: string
  /** Condition list */
  conditions: MedalCondition[]
  /** Condition logic: all=all satisfied / any=any satisfied */
  logic: 'all' | 'any'
}

/** Queryable user metrics */
export interface UserMetrics {
  courseScore: number
  exp: number
  level: number
  questionScore: number
  homeworkScore: number
  commentScore: number
  quizScore: number
  raceScore: number
  questionCount: number
  homeworkCount: number
  commentCount: number
  chapterPassCount: number
}
