/**
 * Question submit shared types
 */

/** upsertUserQuestion input parameters */
export interface QuestionUpsertInput {
  userId: number
  courseId: number
  questionCid: number
  /** 0-1 correct rate */
  rate: number
  /** Score for this submission (= rate * totalPoint, passed in after the caller calculates it) */
  score: number
  /** rate > 0 */
  isCorrect: boolean
  /** User's answer content for this submission; aichat/award can omit this */
  records?: any
  /** Whether to accumulate wrongCount (questions=true, aichat=false) */
  trackWrongCount?: boolean
  /** Whether to increment submitCount (questions=true, aichat=false; aichat always writes 1) */
  trackSubmitCount?: boolean
}

/** upsertUserQuestion return result */
export interface QuestionUpsertResult {
  existing: any
  newSubmitCount: number
  wasFirstRight: boolean
  scoreDelta: number
}

/** Exp/score calculation input */
export interface QuestionCalcArgs {
  qConfig: any
  isCorrect: boolean
  isFirstSubmit: boolean
  newSubmitCount: number
}
