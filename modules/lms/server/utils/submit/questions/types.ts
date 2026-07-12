/**
 * 题目提交共享类型
 */

/** upsertUserQuestion 输入参数 */
export interface QuestionUpsertInput {
  userId: number
  courseId: number
  questionCid: number
  /** 0-1 正确率 */
  rate: number
  /** 本次得分（= rate * totalPoint，调用方计算后传入） */
  score: number
  /** rate > 0 */
  isCorrect: boolean
  /** 用户本次作答内容；aichat/award 可不传 */
  records?: any
  /** 是否累计 wrongCount（questions=true, aichat=false） */
  trackWrongCount?: boolean
  /** 是否累加 submitCount（questions=true, aichat=false；aichat 固定写 1） */
  trackSubmitCount?: boolean
}

/** upsertUserQuestion 返回结果 */
export interface QuestionUpsertResult {
  existing: any
  newSubmitCount: number
  wasFirstRight: boolean
  scoreDelta: number
}

/** 经验/分数计算输入 */
export interface QuestionCalcArgs {
  qConfig: any
  isCorrect: boolean
  isFirstSubmit: boolean
  newSubmitCount: number
}
