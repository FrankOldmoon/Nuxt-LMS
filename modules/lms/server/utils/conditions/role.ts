/**
 * 条件类型：role
 *
 * 检查用户角色。注意：teacher 条件 admin 也能通过（与客户端 render.vue 保持一致）
 */
export function checkRole(user: { roles: string[] }, value: string): boolean {
  if (user.roles.includes(value)) return true
  if (value === 'teacher' && user.roles.includes('admin')) return true
  return false
}
