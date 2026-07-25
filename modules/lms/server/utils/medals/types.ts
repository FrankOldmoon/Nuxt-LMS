// ====================== 类型定义 ======================

/** 奖章条件：某个指标达到某个值 */
export interface MedalCondition {
  /** 指标名：courseScore / exp / level / questionScore / homeworkScore / commentScore / quizScore / raceScore / questionCount / homeworkCount / commentCount / chapterPassCount */
  metric: string
  /** 运算符：>= / > / <= / < / == */
  op: string
  /** 阈值 */
  value: number
}

/** 奖章配置（存入 medals.content） */
export interface MedalContent {
  /** 图标名（lucide） */
  icon: string
  /** 颜色：bronze / silver / gold / diamond / primary / success / warning / error / info */
  color: string
  /** 层级：1=铜 2=银 3=金 4=钻 */
  tier: number
  /** 描述 */
  description: string
  /** 条件列表 */
  conditions: MedalCondition[]
  /** 条件逻辑：all=全部满足 / any=任一满足 */
  logic: 'all' | 'any'
}

/** 可查询的用户指标 */
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
