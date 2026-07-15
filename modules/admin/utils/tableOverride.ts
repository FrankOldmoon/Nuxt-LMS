import type { Component } from 'vue'

/** Delete/restore override: composite primary key tables or tables requiring special handling can register this function */
export type TableDeleteOverride = (
  rows: Record<string, any>[],
  action: 'delete' | 'remove' | 'restore',
) => Promise<any>

/**
 * Table personalization override registry
 *
 * Any table can register custom show / form / cell / delete components/functions via registerTableOverride,
 * generic Manager / CForm / CShow / CellView queries the registry first, falls back to default rendering if no match.
 *
 * Registration timing: typically in plugins (e.g. plugins/overrides.ts), written to REGISTRY at app startup.
 */
export interface TableOverride {
  /** Replace CShow entire window content (row detail preview) */
  show?: Component
  /** Replace CForm entire window content (add/edit form) */
  form?: Component
  /** Reserved: override cell rendering by column jsName */
  cell?: Record<string, Component>
  /** Custom batch delete/restore (composite primary key tables like questions need this override) */
  delete?: TableDeleteOverride
}

const REGISTRY: Record<string, TableOverride> = {}

/** Register override components for a table (merge write) */
export function registerTableOverride(table: string, override: TableOverride) {
  REGISTRY[table] = { ...REGISTRY[table], ...override }
}

/** Query override config for a table (reactive: recompute when tableName changes) */
export function useTableOverride(table: MaybeRefOrGetter<string>) {
  const name = computed(() => toValue(table))
  const override = computed<TableOverride>(() => REGISTRY[name.value] || {})
  return {
    override,
    hasFormOverride: computed(() => !!override.value.form),
    hasShowOverride: computed(() => !!override.value.show),
    hasDeleteOverride: computed(() => !!override.value.delete),
  }
}
