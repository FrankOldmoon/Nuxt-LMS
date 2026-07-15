<template>
  <div class="ide-container">
    <!-- Top toolbar -->
    <IdeToolbar
      v-model:lang="currentLang"
      :lang-items="langItems"
      :runner-ready="runnerReady"
      :running="running"
      :loading-label="currentRunner?.loadingLabel"
      @run="runCode"
      @clear="clearOutput"
    />

    <!-- Top: Monaco editor (80%) -->
    <div class="ide-editor-area">
      <Monaco
        v-model="code"
        :language="monacoLanguage"
        theme="vs-dark"
        :font-size="14"
      />
    </div>

    <!-- Bottom: input box + output box (20%) -->
    <div class="ide-bottom-area">
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

const {
  langItems, currentLang, monacoLanguage, code, inputText, output, running,
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
.ide-bottom-area {
  flex: 2;
  display: flex;
  gap: 1px;
  background: #3c3c3c;
  min-height: 0;
}
</style>
