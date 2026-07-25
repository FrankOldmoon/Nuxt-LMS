/**
 * 条件类型：condition 通用调度器
 *
 * - role / class：自定义处理
 * - question / homework / comment / quiz / race：统一走 cids 检查
 */
import { checkRole } from './conditions/role'
import { checkClass } from './conditions/class'
import { checkCidsByType } from './conditions/cids'

const CID_TYPES = new Set(['question', 'homework', 'comment', 'quiz', 'race'])

/**
 * 单条 condition 的检查入口
 * @param user 当前登录用户
 * @param cond 条件：{ type, value }
 * @returns 是否满足；未识别类型返回 false
 */
export async function checkCondition(
  user: { id: number; roles: string[] },
  cond: { type: string; value: any },
): Promise<boolean> {
  try {
    if (cond.type === 'role') return checkRole(user, cond.value)
    if (cond.type === 'class') return await checkClass(user.id, cond.value)
    if (CID_TYPES.has(cond.type)) return await checkCidsByType(user.id, cond.type, cond.value)
    return false
  } catch (e) {
    console.error('[condition] 检查失败', cond, e)
    return false
  }
}
