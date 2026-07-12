/**
 * 测验提交：分数 + 经验值 + 金币计算
 *
 * 经验值/金币防刷规则（与 questions/submit 一致）：
 * - 首次提交：submitExp / submitCoin
 * - 重新提交未及格：submitExp / submitCoin
 * - 重新提交已及格：不发 submitExp / submitCoin
 * - 及格额外奖：仅"首次及格"那一次发 passBonusExp / passBonusCoin
 */
export type QuizRecord = { questionCid: number; rate: number; point: number; answer?: any }

/** 计算测验总分（rate * point 之和，保留 2 位小数） */
export function calcQuizScore(records: QuizRecord[] | undefined): {
  totalScore: number
  correctCount: number
} {
  let totalScore = 0
  let correctCount = 0
  if (Array.isArray(records)) {
    for (const r of records) {
      const rate = Number(r.rate) || 0
      const qPoint = Number(r.point) || 0
      totalScore += Math.round(rate * qPoint * 100) / 100
      if (rate > 0) correctCount++
    }
  }
  return { totalScore: Math.round(totalScore * 100) / 100, correctCount }
}

export type QuizExpInput = {
  qConfig: { submitExp: number; passBonusExp: number; passScore?: number; [k: string]: any }
  totalScore: number
  /** 已有记录的最高分；新提交时为 null */
  existingBestScore: number | null
}

/**
 * 计算本次提交获得的经验值或金币（防刷）。
 * @param suffix 'Exp' | 'Coin'
 * @returns 增量，直接传给 addCourseScore 用
 */
function calcQuizGained({ qConfig, totalScore, existingBestScore }: QuizExpInput, suffix: 'Exp' | 'Coin'): number {
  const passScore = qConfig.passScore || 60
  const isPassed = totalScore >= passScore
  const alreadyPassed = existingBestScore != null && existingBestScore >= passScore
  // 新提交：submit + (及格且未及格过 ? passBonus : 0)
  if (existingBestScore == null) {
    let val = qConfig[`submit${suffix}`] || 0
    if (isPassed) val += qConfig[`passBonus${suffix}`] || 0
    return val
  }
  // 已有记录：已及格过则彻底防刷；否则同"新提交"逻辑
  if (alreadyPassed) return 0
  let val = qConfig[`submit${suffix}`] || 0
  if (isPassed) val += qConfig[`passBonus${suffix}`] || 0
  return val
}

export function calcQuizExp(args: QuizExpInput): number {
  return calcQuizGained(args, 'Exp')
}

export function calcQuizCoin(args: QuizExpInput): number {
  return calcQuizGained(args, 'Coin')
}
