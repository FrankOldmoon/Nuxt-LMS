/**
 * 经验 → 等级换算（不存库，按 exp 动态计算）
 *
 * 曲线系数 base = levelStep / 2：等级 n 的累计经验阈值 = base * (n-1) * n
 * Lv.1: 0   Lv.2: 100   Lv.3: 300   Lv.4: 600   Lv.5: 1000 ...
 * levelStep 越大升级越慢，由配置 general.levelStep 驱动（lms-public 公开配置，默认 100）
 */
export function expToLevel(totalExp: number, levelStep = 100): number {
    const base = Math.max(1, Number(levelStep) || 100) / 2
    const total = Math.max(0, Number(totalExp) || 0)
    // 解 base*(l-1)*l = total → l = (1 + sqrt(1 + 4*total/base)) / 2
    const raw = (1 + Math.sqrt(1 + (4 * total) / base)) / 2
    return Math.max(1, Math.floor(raw))
}
