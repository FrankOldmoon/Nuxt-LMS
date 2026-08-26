<template>
  <div class="ide-sql-results">
    <div v-if="error" class="ide-sql-error">{{ error }}</div>
    <div v-else-if="!tables.length" class="ide-sql-empty">
      <span class="text-sm text-gray-400">{{ t('ide.sqlRunHint') }}</span>
    </div>
    <div v-else class="ide-sql-tables">
      <div v-for="(table, ti) in tables" :key="ti" class="ide-sql-table-card">
        <div class="ide-sql-table-header">
          <span class="text-xs text-gray-300">
            {{ t('ide.sqlResultTable', { index: ti + 1 }) }}
          </span>
          <span class="text-xs text-gray-500">{{ table.rows.length }} {{ t('ide.sqlRows') }}</span>
        </div>
        <div class="ide-sql-table-wrap">
          <table class="ide-sql-table">
            <thead>
              <tr>
                <th v-for="(col, ci) in table.columns" :key="ci">{{ col }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, ri) in table.rows" :key="ri">
                <td v-for="(cell, ci) in row" :key="ci">{{ cell === null ? 'NULL' : cell }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SqlResultTable } from './runners/types'

const { t } = useI18n()

defineProps<{
  tables: SqlResultTable[]
  error?: string
}>()
</script>

<style scoped>
.ide-sql-results {
  height: 100%;
  overflow: auto;
  background: #1e1e1e;
  padding: 8px;
  box-sizing: border-box;
}
.ide-sql-empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ide-sql-error {
  padding: 10px 12px;
  background: #3a2020;
  border: 1px solid #5c2b2b;
  border-radius: 6px;
  color: #f5c6c6;
  font-size: 12.5px;
  font-family: 'SFMono-Regular', 'Menlo', 'Consolas', monospace;
  white-space: pre-wrap;
  word-break: break-word;
}
.ide-sql-tables {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ide-sql-table-card {
  background: #252526;
  border: 1px solid #3c3c3c;
  border-radius: 6px;
  overflow: hidden;
}
.ide-sql-table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: #2d2d2d;
  border-bottom: 1px solid #3c3c3c;
}
.ide-sql-table-wrap {
  overflow: auto;
  max-height: 220px;
}
.ide-sql-table {
  border-collapse: collapse;
  font-size: 12.5px;
  width: 100%;
  font-family: 'SFMono-Regular', 'Menlo', 'Consolas', monospace;
}
.ide-sql-table th,
.ide-sql-table td {
  border: 1px solid #3c3c3c;
  padding: 4px 10px;
  text-align: left;
  white-space: nowrap;
  color: #d4d4d4;
  background: #1e1e1e;
}
.ide-sql-table th {
  background: #2f4f6f;
  color: #dce9f5;
  font-weight: 600;
  position: sticky;
  top: 0;
}
.ide-sql-table tbody tr:hover td {
  background: #2a2a2a;
}
</style>