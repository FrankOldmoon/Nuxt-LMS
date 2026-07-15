/**
 * Quiz submission: score + exp + coin calculation
 *
 * Exp/coin anti-abuse rules (consistent with questions/submit):
 * - First submission: submitExp / submitCoin
 * - Resubmission when not passed: submitExp / submitCoin
 * - Resubmission when already passed: no submitExp / submitCoin
 * - Pass bonus: only grants passBonusExp / passBonusCoin on the "first pass"
 */
export type QuizRecord = { questionCid: number; rate: number; point: number; answer?: any }

/** Calculate quiz total score (sum of rate * point, keep 2 decimal places) */
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
  /** The highest score of existing record; null for new submission */
  existingBestScore: number | null
}

/**
 * Calculate the exp or coin gained from this submission (anti-abuse).
 * @param suffix 'Exp' | 'Coin'
 * @returns The increment, to be passed directly to addCourseScore
 */
function calcQuizGained({ qConfig, totalScore, existingBestScore }: QuizExpInput, suffix: 'Exp' | 'Coin'): number {
  const passScore = qConfig.passScore || 60
  const isPassed = totalScore >= passScore
  const alreadyPassed = existingBestScore != null && existingBestScore >= passScore
  // New submission: submit + (passed and not passed before ? passBonus : 0)
  if (existingBestScore == null) {
    let val = qConfig[`submit${suffix}`] || 0
    if (isPassed) val += qConfig[`passBonus${suffix}`] || 0
    return val
  }
  // Existing record: if already passed, completely anti-abuse; otherwise same as "new submission" logic
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
