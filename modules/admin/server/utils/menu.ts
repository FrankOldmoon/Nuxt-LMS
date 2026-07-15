import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

/** Menu item structure */
export interface MenuItem {
  /** Leaf nodes have table; group nodes have no table */
  table?: string
  label: string
  visible: boolean
  order: number
  /** Group node children (supports multi-level) */
  children?: MenuItem[]
}

/** Menu config storage key */
export const MENU_CONFIG_KEY = 'admin:menu'

/** Convert camelCase table name to Title Case label (e.g. userRoles → User Roles) */
export function humanizeTableName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
}

/** Generate default menu based on current schema (all visible, alphabetical order) */
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
 * Recursively sync menu tree with current schema:
 * - Remove tables from leaf nodes that no longer exist
 * - Collect all tables already present in the tree
 * Returns synced tree + used tables set
 */
function syncTree(items: MenuItem[], tables: Set<string>): { items: MenuItem[]; used: Set<string> } {
  const used = new Set<string>()
  const result: MenuItem[] = []
  items.forEach((item, idx) => {
    if (item.children && item.children.length > 0) {
      // Group node: recursively sync children
      const child = syncTree(item.children, tables)
      child.used.forEach((t) => used.add(t))
      result.push({
        label: typeof item.label === 'string' && item.label ? item.label : 'Group',
        visible: item.visible !== false,
        order: idx,
        children: child.items.length > 0 ? child.items : undefined,
      })
    } else if (typeof item.table === 'string' && tables.has(item.table)) {
      // Valid leaf node
      used.add(item.table)
      result.push({
        table: item.table,
        label: item.label || humanizeTableName(item.table),
        visible: item.visible !== false,
        order: idx,
      })
    }
    // Neither table nor children, or table no longer exists → discard
  })
  return { items: result, used }
}

/** Read menu config: returns default menu if no record in configs table */
export async function getMenuConfig(): Promise<{ items: MenuItem[] }> {
  const rows = await db
    .select()
    .from(schema.configs)
    .where(eq(schema.configs.id, MENU_CONFIG_KEY))
    .limit(1)

  // jsonb column is unknown, uniformly handled as any (consistent with base config.ts)
  const stored = rows[0]?.value as any as { items?: MenuItem[] } | null
  if (stored && Array.isArray(stored.items) && stored.items.length > 0) {
    const tables = new Set<string>(getSchemaTables())
    const { items, used } = syncTree(stored.items, tables)
    // Append new tables as root leaves
    for (const t of tables) {
      if (!used.has(t)) {
        items.push({ table: t, label: humanizeTableName(t), visible: true, order: items.length })
      }
    }
    return { items }
  }
  return { items: defaultMenu() }
}

/** Save menu config to configs table (upsert) */
export async function setMenuConfig(items: MenuItem[]): Promise<void> {
  await upsertConfig(MENU_CONFIG_KEY, { items })
}
