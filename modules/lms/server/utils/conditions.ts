/**
 * Condition type: condition common dispatcher
 *
 * - role / class: custom handling
 * - question / homework / comment / quiz / race: uniformly go through cids check
 */
import { checkRole } from './conditions/role'
import { checkClass } from './conditions/class'
import { checkCidsByType } from './conditions/cids'

const CID_TYPES = new Set(['question', 'homework', 'comment', 'quiz', 'race'])

/**
 * Single condition check entry
 * @param user Currently logged-in user
 * @param cond Condition: { type, value }
 * @returns Whether satisfied; unrecognized types return false
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
    console.error('[condition] Check failed', cond, e)
    return false
  }
}
