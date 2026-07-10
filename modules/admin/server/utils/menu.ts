import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

/** 菜单项结构 */
export interface MenuItem {
  /** 叶子节点有 table；分组节点无 table */
  table?: string
  label: string
  visible: boolean
  order: number
  /** 分组节点的子项（支持多层级） */
  children?: MenuItem[]
}

/** 菜单配置存储 key */
export const MENU_CONFIG_KEY = 'admin:menu'

/** 将 camelCase 表名转为 Title Case 标签（如 userRoles → User Roles） */
export function humanizeTableName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
}

/** 根据当前 schema 生成默认菜单（全部可见，按字母序） */
export function defaultMenu(): MenuItem[] {
  const tables = getSchemaTables()
  return tables.map((table, index) => ({
    table,
    label: humanizeTableName(table),
    visible: true,
    order: index,
  }))
}

/**
 * 递归同步菜单树与当前 schema：
 * - 移除叶子节点中已不存在的表
 * - 收集树中已出现的所有表
 * 返回同步后的树 + 已用表集合
 */
function syncTree(items: MenuItem[], tables: Set<string>): { items: MenuItem[]; used: Set<string> } {
  const used = new Set<string>()
  const result: MenuItem[] = []
  items.forEach((item, idx) => {
    if (item.children && item.children.length > 0) {
      // 分组节点：递归同步子项
      const child = syncTree(item.children, tables)
      child.used.forEach((t) => used.add(t))
      result.push({
        label: typeof item.label === 'string' && item.label ? item.label : 'Group',
        visible: item.visible !== false,
        order: idx,
        children: child.items.length > 0 ? child.items : undefined,
      })
    } else if (typeof item.table === 'string' && tables.has(item.table)) {
      // 有效叶子节点
      used.add(item.table)
      result.push({
        table: item.table,
        label: item.label || humanizeTableName(item.table),
        visible: item.visible !== false,
        order: idx,
      })
    }
    // 既无 table 又无 children，或 table 已不存在 → 丢弃
  })
  return { items: result, used }
}

/** 读取菜单配置：configs 表无记录则返回默认菜单 */
export async function getMenuConfig(): Promise<{ items: MenuItem[] }> {
  const rows = await db
    .select()
    .from(schema.configs)
    .where(eq(schema.configs.id, MENU_CONFIG_KEY))
    .limit(1)

  // jsonb 列为 unknown，统一以 any 处理（与 base config.ts 一致）
  const stored = rows[0]?.value as any as { items?: MenuItem[] } | null
  if (stored && Array.isArray(stored.items) && stored.items.length > 0) {
    const tables = new Set<string>(getSchemaTables())
    const { items, used } = syncTree(stored.items, tables)
    // 补充新增表为根叶子
    for (const t of tables) {
      if (!used.has(t)) {
        items.push({ table: t, label: humanizeTableName(t), visible: true, order: items.length })
      }
    }
    return { items }
  }
  return { items: defaultMenu() }
}

/** 保存菜单配置到 configs 表（upsert） */
export async function setMenuConfig(items: MenuItem[]): Promise<void> {
  await upsertConfig(MENU_CONFIG_KEY, { items })
}
