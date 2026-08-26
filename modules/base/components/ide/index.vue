<template>
  <div class="ide-container">
    <!-- 顶部工具栏 -->
    <IdeToolbar
      v-model:lang="currentLang"
      :lang-items="langItems"
      :runner-ready="runnerReady"
      :running="running"
      :loading-label="currentRunner?.loadingLabel"
      @run="runCode"
      @clear="clearOutput"
    />

    <!-- 上方：Monaco 编辑器（80%）。伪代码模式左右分栏：左伪代码 / 右 Python，可双向转换 -->
    <div v-if="isPseudoCode" class="ide-editor-area ide-split">
      <div class="ide-editor-pane">
        <div class="ide-pane-header">
          <span class="ide-pane-title">{{ t('ide.langPseudocode') }}</span>
          <button class="ide-pane-btn" :disabled="running" @click="syncPseudoToPy">
            <UIcon name="i-lucide-move-right" class="size-3.5" />
            {{ t('ide.toPython') }}
          </button>
        </div>
        <Monaco
          v-model="code"
          language="plaintext"
          theme="vs-dark"
          :font-size="14"
        />
      </div>
      <div class="ide-editor-pane">
        <div class="ide-pane-header">
          <span class="ide-pane-title">{{ t('ide.langPython') }}</span>
          <button class="ide-pane-btn" :disabled="running" @click="syncPyToPseudo">
            <UIcon name="i-lucide-move-left" class="size-3.5" />
            {{ t('ide.toPseudocode') }}
          </button>
        </div>
        <Monaco
          v-model="pseudoPython"
          language="python"
          theme="vs-dark"
          :font-size="14"
        />
      </div>
      <div v-if="pseudoErr" class="ide-pseudo-errbar">{{ pseudoErr }}</div>
    </div>
    <div v-else class="ide-editor-area">
      <Monaco
        v-model="code"
        :language="monacoLanguage"
        theme="vs-dark"
        :font-size="14"
      />
    </div>

    <!-- 下方：输入框 + 输出框（20%）。SQL 模式隐藏，改用多张结果表展示 -->
    <div v-if="isSql" class="ide-sql-area">
      <IdeSqlResults :tables="sqlTables" :error="sqlError" />
    </div>
    <div v-else class="ide-bottom-area">
      <IdeInputPanel v-model:input="inputText" />
      <IdeOutputPanel :output="output" />
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: String, default: '' },
  language: { type: String, default: 'python' },
})

const emit = defineEmits(['update:modelValue'])

const { t } = useI18n()

const {
  langItems, currentLang, monacoLanguage, isPseudoCode, pseudoPython, pseudoErr, syncPseudoToPy, syncPyToPseudo, isSql, sqlTables, sqlError, code, inputText, output, running,
  currentRunner, runnerReady, runCode, clearOutput,
} = useIde(
  () => props.modelValue,
  () => props.language,
  (val) => emit('update:modelValue', val),
)
</script>

<style scoped>
.ide-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 500px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: #1e1e1e;
}
.ide-editor-area {
  flex: 8;
  min-height: 0;
  overflow: hidden;
}
.ide-editor-area.ide-split {
  display: flex;
  gap: 1px;
  background: #3c3c3c;
}
.ide-editor-pane {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
}
.ide-pane-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: #252526;
  border-bottom: 1px solid #3c3c3c;
  flex-shrink: 0;
}
.ide-pane-title {
  font-size: 12px;
  color: #e2e8f0;
  font-weight: 500;
}
.ide-pane-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #e2e8f0;
  background: #3a3a3a;
  border: 1px solid #4a4a4a;
  border-radius: 5px;
  padding: 2px 8px;
  cursor: pointer;
  margin-left: auto;
}
.ide-pane-btn:hover:not(:disabled) {
  background: #4a4a4a;
}
.ide-pane-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.ide-pseudo-errbar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 20;
  padding: 6px 12px;
  background: #3a2020;
  color: #f5c6c6;
  font-size: 12px;
  font-family: 'SFMono-Regular', 'Menlo', 'Consolas', monospace;
  white-space: pre-wrap;
  word-break: break-word;
}
.ide-split {
  position: relative;
}
.ide-editor-pane .monaco-container,
.ide-editor-pane :deep(.w-full),
.ide-editor-pane :deep(.h-full) {
  flex: 1;
  min-height: 0;
}
.ide-bottom-area {
  flex: 2;
  display: flex;
  gap: 1px;
  background: #3c3c3c;
  min-height: 0;
}
.ide-sql-area {
  flex: 2;
  min-height: 0;
  overflow: hidden;
  border-top: 1px solid #3c3c3c;
}
</style>
