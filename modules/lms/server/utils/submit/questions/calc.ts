/**
 * Question submission pure calculation functions (no db dependency)
 */
import type { QuestionCalcArgs } from './types'

/**
 * Calculate the exp/coin gained from question submission (anti-abuse rules)
 *  - First submission: submitExp / submitCoin
 *  - First submission and correct: submit + correctBonus + firstCorrectBonus
 *  - Exceeds maxSubmitCount: gainedExp=0 / gainedCoin=0
 */
function calcQuestionGained(args: QuestionCalcArgs, suffix: 'Exp' | 'Coin'): number {
  let gained = 0
  if (args.isFirstSubmit) {
    gained = args.qConfig[`submit${suffix}`] || 0
    if (args.isCorrect) {
      gained += (args.qConfig[`correctBonus${suffix}`] || 0) + (args.qConfig[`firstCorrectBonus${suffix}`] || 0)
    }
  }
  if (args.newSubmitCount > (args.qConfig.maxSubmitCount || Infinity)) {
    gained = 0
  }
  return gained
}

export function calcQuestionGainedExp(args: QuestionCalcArgs): number {
  return calcQuestionGained(args, 'Exp')
}

export function calcQuestionGainedCoin(args: QuestionCalcArgs): number {
  return calcQuestionGained(args, 'Coin')
}

/**
 * Calculate the score increment of the question (only scored on the "first correct" submission).
 *   wasFirstRight=true: scoreDelta=0
 *   wasFirstRight=false && isCorrect: scoreDelta=score
 *   isCorrect=false: scoreDelta=0
 */
export function calcQuestionScoreDelta(args: {
  score: number
  isCorrect: boolean
  wasFirstRight: boolean
}): number {
  return (args.isCorrect && !args.wasFirstRight) ? args.score : 0
}
