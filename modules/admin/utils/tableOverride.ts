import type { Component } from 'vue'

/** 删除/恢复覆盖：复合主键表或需要特殊处理的表可注册此函数 */
export type TableDeleteOverride = (
  rows: Record<string, any>[],
  action: 'delete' | 'remove' | 'restore',
) => Promise<any>

/**
 * 表个性化覆盖注册表
 *
 * 任意表可通过 registerTableOverride 注册自定义的 show / form / cell / delete 组件/函数，
 * 通用 Manager / CForm / CShow / CellView 优先查询注册表，未命中则回退默认渲染。
 *
 * 注册时机：通常在插件中（如 plugins/overrides.ts），在 app 启动时写入 REGISTRY。
 */
export interface TableOverride {
  /** 替换 CShow 整窗内容（行详情预览） */
  show?: Component
  /** 替换 CForm 整窗内容（新增/编辑表单） */
  form?: Component
  /** 预留：按列 jsName 覆盖单元格渲染 */
  cell?: Record<string, Component>
  /** 自定义批量删除/恢复（复合主键表如 questions 需要此覆盖） */
  delete?: TableDeleteOverride
}

const REGISTRY: Record<string, TableOverride> = {}

/** 注册某表的覆盖组件（合并写入） */
export function registerTableOverride(table: string, override: TableOverride) {
  REGISTRY[table] = { ...REGISTRY[table], ...override }
}

/** 查询某表的覆盖配置（响应式：tableName 变化时重新计算） */
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
