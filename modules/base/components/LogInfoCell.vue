<template>
  <div v-if="log?.exists" class="flex flex-col gap-0.5">
    <span :class="error && log.sizeBytes > 0 ? 'text-xs font-mono text-red-500' : 'text-xs font-mono'">
      {{ formatBytes(log.sizeBytes) }}
    </span>
    <span class="text-xs text-muted">{{ formatTime(log.modifiedAt) }}</span>
  </div>
  <span v-else class="text-xs text-muted">文件不存在</span>
</template>

<script setup lang="ts">
const props = defineProps<{
  log: { path: string; exists: boolean; sizeBytes: number; modifiedAt: string | null } | null
  error?: boolean
}>()

function formatBytes(n: number): string {
  if (!n) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let v = n
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`
}
function formatTime(s: string | null): string {
  return s ? new Date(s).toLocaleString() : '—'
}
</script>
