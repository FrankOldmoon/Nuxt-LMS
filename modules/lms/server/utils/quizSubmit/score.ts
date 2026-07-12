/**
 * 测验提交：分数 + 经验值计算
 *
 * 经验值防刷规则（与 questions/submit 一致）：
 * - 首次提交：submitExp
 * - 重新提交未及格：submitExp
 * - 重新提交已及格：不发 submitExp
 * - 及格额外奖：仅"首次及格"那一次发 passBonusExp
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
  qConfig: { submitExp: number; passBonusExp: number; passScore?: number }
  totalScore: number
  /** 已有记录的最高分；新提交时为 null */
  existingBestScore: number | null
}

/**
 * 计算本次提交获得的经验值（防刷）。
 * @returns gainedExp 直接 addCourseScore 用的增量
 */
export function calcQuizExp({ qConfig, totalScore, existingBestScore }: QuizExpInput): number {
  const passScore = qConfig.passScore || 60
  const isPassed = totalScore >= passScore
  const alreadyPassed = existingBestScore != null && existingBestScore >= passScore
  // 新提交：submitExp + (及格且未及格过 ? passBonusExp : 0)
  if (existingBestScore == null) {
    let exp = qConfig.submitExp
    if (isPassed) exp += qConfig.passBonusExp
    return exp
  }
  // 已有记录：已及格过则彻底防刷（gainedExp=0）；否则同"新提交"逻辑
  if (alreadyPassed) return 0
  let exp = qConfig.submitExp
  if (isPassed) exp += qConfig.passBonusExp
  return exp
}
