<template>
  <!-- 右侧：代码运行 / 预览面板 -->
  <aside class="h-full flex flex-col min-w-0 bg-default border-l border-default">
    <!-- 头部 -->
    <div class="h-11 shrink-0 flex items-center gap-2 px-3 border-b border-default">
      <UIcon name="i-lucide-terminal" class="size-4 text-muted shrink-0" />
      <span class="text-sm font-medium shrink-0">{{ $t('chat.codeBlocks') }}</span>

      <USelect
        v-if="blocks.length > 1"
        v-model="selected"
        :items="blockItems"
        size="xs"
        class="w-40 ml-1"
      />
      <UBadge v-else-if="current" color="neutral" variant="soft" size="sm" class="ml-1">
        {{ current.label }}
      </UBadge>
      <UIcon v-if="current?.partial" name="i-lucide-loader-2" class="size-3 animate-spin text-primary shrink-0" />

      <div class="ml-auto flex items-center gap-1 shrink-0">
        <UTooltip :text="$t('chat.clear')">
          <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-eraser"
            :disabled="!output && !previewLogs.length" @click="clearOutput" />
        </UTooltip>
        <UTooltip :text="$t('chat.copy')">
          <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-copy"
            :disabled="!current" @click="copyCode" />
        </UTooltip>
        <UButton size="xs" color="primary" icon="i-lucide-play" :loading="running" :disabled="!canRun" @click="run">
          {{ $t('chat.run') }}
        </UButton>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!blocks.length" class="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
      <UIcon name="i-lucide-code-xml" class="size-10 text-dimmed" />
      <p class="text-sm text-muted">{{ $t('chat.noCode') }}</p>
      <p class="text-xs text-dimmed">{{ $t('chat.noCodeHint') }}</p>
    </div>

    <template v-else>
      <!-- 代码 -->
      <div class="flex-1 min-h-0 overflow-auto border-b border-default">
        <pre class="p-3 text-xs leading-relaxed font-mono whitespace-pre"><code>{{ current?.code }}</code></pre>
      </div>

      <!-- 输出 -->
      <div class="flex flex-col shrink-0" :class="isHtml ? 'h-[46%]' : 'h-[42%]'">
        <div class="h-8 shrink-0 flex items-center gap-2 px-3 border-b border-default text-xs text-muted">
          <UIcon name="i-lucide-scroll-text" class="size-3.5" />
          <span>{{ isHtml ? 'Preview' : $t('chat.output') }}</span>
          <span v-if="!isHtml && runnerLabel" class="text-dimmed">· {{ runnerLabel }}</span>
        </div>

        <!-- HTML 实时预览 -->
        <div v-if="isHtml" class="flex-1 min-h-0 bg-white">
          <iframe
            :key="previewKey"
            :srcdoc="previewDoc"
            class="w-full h-full border-0"
            sandbox="allow-scripts allow-forms allow-modals allow-popups"
          />
        </div>

        <!-- SQL 结果表 -->
        <div v-else-if="current?.lang === 'sql'" class="flex-1 min-h-0 overflow-auto">
          <IdeSqlResults :tables="sqlTables" :error="sqlError" />
        </div>

        <!-- 普通文本输出 -->
        <div v-else class="flex-1 min-h-0 overflow-auto">
          <pre v-if="output" class="p-3 text-xs leading-relaxed font-mono whitespace-pre-wrap text-highlighted">{{ output }}</pre>
          <div v-else class="h-full flex items-center justify-center text-xs text-dimmed">
            {{ running ? $t('chat.running') : '—' }}
          </div>
        </div>

        <!-- console 探针输出（仅 HTML 预览） -->
        <div v-if="isHtml && previewLogs.length" class="h-24 shrink-0 overflow-auto border-t border-default bg-elevated/50">
          <div v-for="(l, i) in previewLogs" :key="i" class="px-3 py-0.5 text-[11px] font-mono"
            :class="l.type === 'error' ? 'text-error' : l.type === 'warn' ? 'text-warning' : 'text-muted'">
            <span class="text-dimmed mr-1">›</span>{{ l.text }}
          </div>
        </div>
      </div>
    </template>
  </aside>
</template>

<script setup lang="ts">
import type { Runner, SqlResultTable } from '../../../base/components/ide/runners/types'

const props = defineProps<{
  /** 要解析代码块的文本（通常是最新一条 assistant 回复） */
  content?: string
}>()

const { t } = useI18n()

// ============ 代码块提取 ============
interface CodeBlock {
  lang: string
  label: string
  code: string
  /** 流式生成中（代码块尚未闭合） */
  partial?: boolean
}

const FENCE_RE = /```([^\n`]*)\n([\s\S]*?)```/g

/** 语言别名归一；无法识别时按内容猜测 */
function normalizeLang(raw: string, code: string): string {
  const l = (raw || '').trim().toLowerCase().replace(/^language-/, '')
  if (['py', 'python', 'python3'].includes(l)) return 'python'
  if (['js', 'javascript', 'jsx', 'node', 'mjs', 'ts', 'typescript', 'tsx'].includes(l)) return 'javascript'
  if (['c', 'cpp', 'c++', 'cc', 'cxx', 'objc'].includes(l)) return 'cpp'
  if (['java'].includes(l)) return 'java'
  if (['sql', 'postgresql', 'mysql', 'sqlite'].includes(l)) return 'sql'
  if (['pseudocode', 'pseudo'].includes(l)) return 'pseudocode'
  if (['html', 'htm', 'xhtml', 'vue'].includes(l)) return 'html'
  if (l) return l
  // 无语言标记：按特征猜
  if (/^\s*<(!doctype|html)/i.test(code) || /<(div|span|body|h1|p)\b/i.test(code)) return 'html'
  if (/console\.(log|error)|function\s|const\s|let\s/.test(code)) return 'javascript'
  if (/^\s*(def |import |from |print\()/m.test(code)) return 'python'
  if (/^\s*(SELECT|INSERT|CREATE|UPDATE|DELETE)\b/im.test(code)) return 'sql'
  return ''
}

const LABELS: Record<string, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  cpp: 'C++',
  java: 'Java',
  sql: 'SQL',
  pseudocode: 'Pseudocode',
  html: 'HTML',
  css: 'CSS',
}

function pushBlock(out: CodeBlock[], rawLang: string, code: string, partial = false) {
  const trimmed = code.replace(/\s+$/, '')
  if (!trimmed.trim()) return
  const lang = normalizeLang(rawLang, trimmed)
  out.push({
    lang,
    label: LABELS[lang] || (rawLang || '').trim() || 'code',
    code: trimmed,
    partial,
  })
}

const blocks = computed<CodeBlock[]>(() => {
  const text = props.content || ''
  const out: CodeBlock[] = []
  FENCE_RE.lastIndex = 0
  let m: RegExpExecArray | null
  let consumed = 0
  while ((m = FENCE_RE.exec(text))) {
    pushBlock(out, m[1] || '', m[2] || '')
    consumed = FENCE_RE.lastIndex
  }
  // 流式生成中：最后一个代码块还没闭合，也先显示出来（否则右侧面板全程空白）
  const rest = text.slice(consumed)
  const open = rest.indexOf('```')
  if (open >= 0) {
    const after = rest.slice(open + 3)
    const nl = after.indexOf('\n')
    if (nl >= 0) {
      pushBlock(out, after.slice(0, nl), after.slice(nl + 1), true)
    }
  }
  return out
})

const selected = ref(0)
// 只在块数量收缩时重置选择，避免流式过程中不断打断用户查看的块
watch(() => blocks.value.length, (n) => {
  if (selected.value >= n) selected.value = 0
})
const current = computed(() => blocks.value[selected.value])

const blockItems = computed(() =>
  blocks.value.map((b, i) => ({
    label: `${i + 1}. ${b.label} · ${b.code.split('\n').length}L`,
    value: i,
  })),
)

// ============ HTML 预览（含 css/js 块合并）============
const isHtml = computed(() => current.value?.lang === 'html')
const previewKey = ref(0)
const previewLogs = ref<{ type: string; text: string }[]>([])

/** 把 console/error 桥接到父窗口，让预览面板能看到输出 */
function probeScript(): string {
  // 注意：字符串里不能出现完整的 script 结束标签，否则会截断 SFC / srcdoc
  const close = '<' + '/script>'
  return '<script>(function(){'
    + 'var S=function(type,args){try{parent.postMessage({__chatPreview:1,type:type,text:Array.prototype.map.call(args,function(a){try{return typeof a==="object"?JSON.stringify(a):String(a)}catch(e){return String(a)}}).join(" ") },"*")}catch(e){}};'
    + '["log","info","warn","error"].forEach(function(k){var o=console[k];console[k]=function(){S(k,arguments);try{o.apply(console,arguments)}catch(e){}}});'
    + 'window.onerror=function(m){S("error",[m])};'
    + '})();' + close
}

const previewDoc = ref('')

function buildPreviewDoc(): string {
  const html = current.value?.code || ''
  const others = blocks.value.filter((b) => b !== current.value)
  const css = others.filter((b) => b.lang === 'css').map((b) => b.code).join('\n')
  const js = others.filter((b) => b.lang === 'javascript').map((b) => b.code).join('\n;\n')

  let doc = html
  if (css) {
    const style = `<style>${css}</style>`
    doc = /<\/head>/i.test(doc) ? doc.replace(/<\/head>/i, `${style}</head>`) : `${style}${doc}`
  }
  if (js) {
    const close = '<' + '/script>'
    const script = `<script>try{${js}}catch(e){console.error(e.message)}${close}`
    doc = /<\/body>/i.test(doc) ? doc.replace(/<\/body>/i, `${script}</body>`) : `${doc}${script}`
  }
  // 探针插到最前，保证后续脚本的 console 都被劫持
  const probe = probeScript()
  if (/<head[^>]*>/i.test(doc)) return doc.replace(/<head[^>]*>/i, (m) => m + probe)
  if (/<html[^>]*>/i.test(doc)) return doc.replace(/<html[^>]*>/i, (m) => m + probe)
  return probe + doc
}

/** 重建 iframe（避免流式期间每来一个字符就重载预览） */
function renderPreview() {
  if (!isHtml.value) return
  previewLogs.value = []
  previewDoc.value = buildPreviewDoc()
  previewKey.value++
}

// 代码块闭合后自动预览一次；流式未闭合时不动
watch(
  () => `${current.value?.lang}|${current.value?.partial}|${current.value?.code}`,
  () => {
    if (!isHtml.value) {
      previewDoc.value = ''
      return
    }
    if (!current.value?.partial) renderPreview()
  },
  { immediate: true },
)

function onPreviewMessage(e: MessageEvent) {
  const d: any = e.data
  if (!d || d.__chatPreview !== 1) return
  previewLogs.value.push({ type: String(d.type || 'log'), text: String(d.text ?? '') })
  if (previewLogs.value.length > 200) previewLogs.value.splice(0, previewLogs.value.length - 200)
}

onMounted(() => window.addEventListener('message', onPreviewMessage))
onBeforeUnmount(() => window.removeEventListener('message', onPreviewMessage))

// ============ 语言运行器（懒加载：Java/C++ 解释器体积大，按需拉 chunk）============
type RunnerFactory = () => Promise<Runner>
const FACTORIES: Record<string, RunnerFactory> = {
  python: async () => (await import('../../../base/components/ide/runners/python')).createPythonRunner(),
  javascript: async () => (await import('../../../base/components/ide/runners/javascript')).createJavascriptRunner(),
  cpp: async () => (await import('../../../base/components/ide/runners/cpp')).createCppRunner(),
  java: async () => (await import('../../../base/components/ide/runners/java')).createJavaRunner(),
  sql: async () => (await import('../../../base/components/ide/runners/sql')).createSqlRunner(),
  pseudocode: async () => (await import('../../../base/components/ide/runners/pseudocode')).createPseudocodeRunner(),
}

const runners: Record<string, Runner> = {}
const pending: Record<string, Promise<Runner>> = {}
const output = ref('')
const running = ref(false)
const sqlTables = ref<SqlResultTable[]>([])
const sqlError = ref('')
const runnerLabel = ref('')
const ready = ref(false)
const toast = useToast()

const canRun = computed(() => {
  if (!current.value) return false
  if (isHtml.value) return true
  return current.value.lang in FACTORIES
})

async function getRunner(lang: string): Promise<Runner | null> {
  const factory = FACTORIES[lang]
  if (!factory) return null
  if (runners[lang]) return runners[lang]
  if (!pending[lang]) {
    pending[lang] = factory().then((r) => {
      runners[lang] = r
      r.init().then(() => { ready.value = true }).catch((e: any) => { output.value += `${e?.message || e}\n` })
      return r
    })
  }
  return pending[lang]
}

async function run() {
  if (!current.value || running.value) return
  const block = current.value

  if (block.lang === 'html') {
    renderPreview()
    return
  }

  running.value = true
  output.value = ''
  sqlTables.value = []
  sqlError.value = ''
  try {
    const runner = await getRunner(block.lang)
    if (!runner) {
      output.value = t('chat.unsupported')
      return
    }
    runnerLabel.value = runner.loadingLabel || ''
    await runner.init()
    ready.value = true
    runnerLabel.value = ''
    await runner.run({
      code: block.code,
      input: '',
      onOutput: (text) => { output.value += text },
      onResults: (tables) => { sqlTables.value = tables },
      onError: (msg) => { sqlError.value = msg },
    })
  } catch (e: any) {
    output.value += `\n${e?.message || e}\n`
  } finally {
    running.value = false
    runnerLabel.value = ''
  }
}

function clearOutput() {
  output.value = ''
  sqlTables.value = []
  sqlError.value = ''
  previewLogs.value = []
  if (isHtml.value) renderPreview()
}

async function copyCode() {
  if (!current.value) return
  try {
    await navigator.clipboard.writeText(current.value.code)
    toast.add({ title: t('chat.copied'), color: 'success' })
  } catch { /* 忽略：非 https 或未授权 */ }
}

defineExpose({ run })
</script>
