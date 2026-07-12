<template>
  <div class="ide-output-panel">
    <div class="ide-panel-header">
      <UIcon name="i-lucide-monitor" class="size-3.5 text-gray-400" />
      <span class="text-xs text-gray-400">{{ t('ide.output') }}</span>
    </div>
    <pre class="ide-output-content">{{ output }}</pre>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

defineProps<{
  output: string
}>()
</script>

<style scoped>
.ide-output-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
  min-height: 0;
}
.ide-panel-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #252526;
  border-bottom: 1px solid #3c3c3c;
  flex-shrink: 0;
}
.ide-output-content {
  flex: 1;
  overflow: auto;
  padding: 8px;
  margin: 0;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  color: #d4d4d4;
  background: #1e1e1e;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
