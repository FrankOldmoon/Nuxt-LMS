/**
 * 题目提交纯计算函数（无 db 依赖）
 */
import type { QuestionCalcArgs } from './types'

/**
 * 计算题目提交的经验值/金币（防刷规则）
 *  - 首次提交：submitExp / submitCoin
 *  - 首次提交且答对：submit + correctBonus + firstCorrectBonus
 *  - 超过 maxSubmitCount：gainedExp=0 / gainedCoin=0
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
 * 计算题目的分数增量（仅"首次作对"那一次计分）。
 *   wasFirstRight=true：scoreDelta=0
 *   wasFirstRight=false && isCorrect：scoreDelta=score
 *   isCorrect=false：scoreDelta=0
 */
export function calcQuestionScoreDelta(args: {
  score: number
  isCorrect: boolean
  wasFirstRight: boolean
}): number {
  return (args.isCorrect && !args.wasFirstRight) ? args.score : 0
}
