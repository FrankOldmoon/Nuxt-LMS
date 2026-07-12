/**
 * 题目提交纯计算函数（无 db 依赖）
 */
import type { QuestionCalcArgs } from './types'

/**
 * 计算题目提交的经验值（防刷规则）
 *  - 首次提交：submitExp
 *  - 首次提交且答对：submitExp + correctBonusExp + firstCorrectBonusExp
 *  - 超过 maxSubmitCount：gainedExp=0
 */
export function calcQuestionGainedExp(args: QuestionCalcArgs): number {
  let gainedExp = 0
  if (args.isFirstSubmit) {
    gainedExp = args.qConfig.submitExp || 0
    if (args.isCorrect) {
      gainedExp += (args.qConfig.correctBonusExp || 0) + (args.qConfig.firstCorrectBonusExp || 0)
    }
  }
  if (args.newSubmitCount > (args.qConfig.maxSubmitCount || Infinity)) {
    gainedExp = 0
  }
  return gainedExp
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
