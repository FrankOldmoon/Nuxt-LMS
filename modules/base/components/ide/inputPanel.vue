<template>
  <div class="ide-input-panel">
    <div class="ide-panel-header">
      <UIcon name="i-lucide-keyboard" class="size-3.5 text-gray-400" />
      <span class="text-xs text-gray-400">{{ t('ide.input') }}</span>
    </div>
    <textarea
      v-model="inputText"
      class="ide-input-textarea"
      :placeholder="t('ide.inputPlaceholder')"
    />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

const inputText = defineModel<string>('input', { default: '' })
</script>

<style scoped>
.ide-input-panel {
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
.ide-input-textarea {
  flex: 1;
  border: none;
  outline: none;
  padding: 8px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  color: #d4d4d4;
  background: #1e1e1e;
  resize: none;
}
.ide-input-textarea::placeholder {
  color: #6b7280;
}
</style>
