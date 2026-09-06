<template>
  <div class="text-preview">
    <div v-if="loading" class="tp-state">{{ $t('common.loading') }}</div>
    <div v-else-if="error" class="tp-state tp-error">{{ error }}</div>
    <template v-else>
      <div class="tp-meta">{{ langLabel }} · {{ lineCount }} {{ $t('ueditor.textPreviewLines') }} · {{ chars }} {{ $t('ueditor.textPreviewChars') }}</div>
      <!-- 复用 codeBlock 组件实现语法高亮 -->
      <CodeBlockView :node="codeNode" />
    </template>
  </div>
</template>

<script setup>
import CodeBlockView from './code-block.vue'

const props = defineProps({
  url: { type: String, required: true },
  name: { type: String, default: '' },
})

const { t } = useI18n()
const loading = ref(true)
const error = ref('')
const content = ref('')

const ext = computed(() => (props.name ? props.name.split('.').pop() : '').toLowerCase())
const LANG_LABEL = {
  md: 'Markdown', txt: 'Text', log: 'Log',
  js: 'JavaScript', jsx: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript',
  ts: 'TypeScript', tsx: 'TypeScript',
  py: 'Python', rb: 'Ruby', go: 'Go', rs: 'Rust', java: 'Java', c: 'C', h: 'C', cpp: 'C++', hpp: 'C++', cs: 'C#', php: 'PHP',
  json: 'JSON', xml: 'XML', yaml: 'YAML', yml: 'YAML', toml: 'TOML', ini: 'INI', conf: 'Config', properties: 'Config',
  html: 'HTML', htm: 'HTML', css: 'CSS', scss: 'SCSS', less: 'LESS', vue: 'Vue', svelte: 'Svelte',
  sh: 'Shell', bash: 'Shell', zsh: 'Shell', bat: 'Batch', ps1: 'PowerShell',
  sql: 'SQL', csv: 'CSV', svg: 'SVG', dockerfile: 'Dockerfile', graphql: 'GraphQL',
}
const langLabel = computed(() => LANG_LABEL[ext.value] || (ext.value ? ext.value.toUpperCase() : 'Text'))

const lineCount = computed(() => content.value ? content.value.split('\n').length : 0)
const chars = computed(() => content.value ? content.value.length : 0)

// 传给 codeBlock 的语言（useCodeBlock 会做别名映射，unknown 自动降级纯文本）
const codeNode = computed(() => ({
  type: 'codeBlock',
  attrs: { language: ext.value || 'text' },
  content: [{ type: 'text', text: content.value }],
}))

onMounted(async () => {
  try {
    if (/^blob:/i.test(props.url)) {
      error.value = t('ueditor.file.notUploaded')
      return
    }
    const resp = await fetch(props.url)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    content.value = await resp.text()
  } catch (e) {
    error.value = `${t('ueditor.file.loadTextFailed')}: ${e?.message || String(e)}`
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.text-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  min-height: 200px;
}
.tp-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #9ca3af;
  font-size: 14px;
}
.tp-error { color: #ef4444; }
.tp-meta {
  font-size: 12px;
  color: #9ca3af;
}
</style>