<template>
  <!-- 右侧：代码运行 / 预览面板 -->
  <aside class="h-full flex flex-col min-w-0 bg-default border-l border-default">
    <!-- 头部 -->
    <div class="h-11 shrink-0 flex items-center gap-2 px-3 border-b border-default">
      <UIcon name="i-lucide-terminal" class="size-4 text-muted shrink-0" />
      <span class="text-sm font-medium shrink-0">{{ $t('chat.codeBlocks') }}</span>

      <!-- 多块：平铺标签条，点哪个切哪个（可横向滚动，不占下拉的展开操作） -->
      <div v-if="blocks.length > 1" class="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto chat-tabs">
        <button
          v-for="(b, i) in blocks"
          :key="i"
          type="button"
          class="shrink-0 px-2 py-0.5 rounded-md text-[11px] leading-5 transition-colors"
          :class="i === selected
            ? 'bg-primary/15 text-primary font-medium'
            : 'text-muted hover:bg-elevated'"
          :title="`${b.label} · ${b.code.split('\n').length} 行`"
          @click="selected = i"
        >
          {{ i + 1 }}<span class="ml-1 opacity-70">{{ tabLabel(b) }}</span>
        </button>
      </div>
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
        <UTooltip v-if="canRunAll" :text="$t('chat.runAll')">
          <UButton size="xs" color="primary" variant="soft" icon="i-lucide-layers"
            :aria-label="$t('chat.runAll')" :loading="running" @click="runAll" />
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
      <!-- 不可执行的文件（3D 模型 / 图片 / PDF / office…）：整块交给项目通用预览器 -->
      <div v-if="current?.previewUrl" class="flex-1 min-h-0 overflow-auto bg-elevated/20">
        <UeditorFilePreview :url="current.previewUrl" :name="current.label" />
      </div>

      <!-- 代码（可编辑：改完直接点运行） -->
      <div v-else class="flex-1 min-h-0 border-b border-default relative">
        <textarea
          v-model="editedCode"
          class="w-full h-full p-3 text-xs leading-relaxed font-mono bg-transparent outline-none resize-none text-highlighted"
          spellcheck="false"
          autocapitalize="off"
          autocomplete="off"
          @input="dirty = true"
        />
        <UTooltip v-if="dirty" :text="$t('chat.revert')">
          <UButton
            size="xs"
            color="warning"
            variant="soft"
            icon="i-lucide-rotate-ccw"
            class="absolute top-2 right-3"
            @click="revertCode"
          />
        </UTooltip>
      </div>

      <!-- 输出 -->
      <div v-if="!current?.previewUrl" class="flex flex-col shrink-0" :class="isHtml ? 'h-[46%]' : 'h-[42%]'">
        <div class="h-8 shrink-0 flex items-center gap-2 px-3 border-b border-default text-xs text-muted">
          <UIcon name="i-lucide-scroll-text" class="size-3.5" />
          <span>{{ isHtml ? 'Preview' : $t('chat.output') }}</span>
          <span v-if="!isHtml && runnerLabel" class="text-dimmed">· {{ runnerLabel }}</span>
          <UTooltip v-if="isHtml" :text="$t('chat.fullscreen')" class="ml-auto">
            <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-maximize-2"
              :aria-label="$t('chat.fullscreen')" :disabled="!editedCode" @click="openFullscreen" />
          </UTooltip>
        </div>

        <!-- HTML 实时预览 -->
        <div v-if="isHtml" class="flex-1 min-h-0 bg-white">
          <iframe
            :key="previewKey"
            :srcdoc="previewDoc"
            class="w-full h-full border-0"
            sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads"
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

  <!-- 全屏预览：自定义覆盖层（UModal fullscreen 的 wrapper 自带 padding，铺不满） -->
  <Teleport to="body">
    <div v-if="previewFullscreen" class="fixed inset-0 z-[70] flex flex-col bg-default">
      <div class="h-10 shrink-0 flex items-center gap-2 px-3 border-b border-default">
        <UIcon name="i-lucide-monitor" class="size-4 text-muted" />
        <span class="text-xs text-muted">Preview</span>
        <span class="text-xs text-dimmed truncate">{{ current?.label }}</span>
        <UButton
          class="ml-auto"
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="xs"
          :aria-label="$t('chat.exitFullscreen')"
          @click="previewFullscreen = false"
        />
      </div>
      <iframe
        :srcdoc="previewDoc"
        class="flex-1 w-full border-0 bg-white"
        sandbox="allow-scripts allow-forms allow-modals allow-popups"
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { Runner, SqlResultTable } from '../../../base/components/ide/runners/types'
// 通用文件预览器（图片/pdf/视频/3D/office/zip/文本）没有自动注册，需显式引入
import UeditorFilePreview from '../../../lms/components/ueditor/render/nodes/file-preview.vue'

const props = defineProps<{
  /** 要解析代码块的文本（通常是最新一条 assistant 回复） */
  content?: string
  /** 会话 ID：用于把 agent 写出的工作区文件也列进面板 */
  conversationId?: number
}>()

const { t } = useI18n()

// ============ 代码块提取 ============
interface CodeBlock {
  lang: string
  label: string
  code: string
  /** 流式生成中（代码块尚未闭合 / 文件内容还没拉下来） */
  partial?: boolean
  kind?: 'message' | 'file'
  /** kind=file 时的相对路径 */
  path?: string
  /** 可执行（走代码区 + Run）；否则走通用预览器 */
  runnable?: boolean
  /** 不可执行文件的预览 URL */
  previewUrl?: string
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

/** 从消息正文里解析出的代码块 */
const parsedBlocks = computed<CodeBlock[]>(() => {
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

// ============ 工作区文件（agent 写出来的产物同样是「代码」）============
// 之前面板只认消息正文里的 ``` 围栏，导致 agent 用 write_file 生成文件后
// 右边一片空白 —— 明明有产出却看不到、也跑不了。
const RUNNABLE_EXT: Record<string, string> = {
  html: 'html',
  htm: 'html',
  py: 'python',
  js: 'javascript',
  mjs: 'javascript',
  cpp: 'cpp',
  cc: 'cpp',
  java: 'java',
  sql: 'sql',
  css: 'css',
}

interface FileMeta { path: string; label: string; lang: string; runnable: boolean }

/** 预览用的内联 URL（download 默认是 attachment，预览器拿不到内容） */
function inlineUrl(path: string) {
  return `/api/chat/workspace/download?conversation_id=${props.conversationId}&path=${encodeURIComponent(path)}&inline=1`
}

const fileMeta = ref<FileMeta[]>([])
// 只有可执行文件的正文需要拉下来编辑；图片 / 3D / PDF 走 URL 预览，不进内存
const fileContents = reactive<Record<string, string>>({})

async function reloadFiles() {
  const id = props.conversationId
  if (!id) {
    fileMeta.value = []
    return
  }
  try {
    const rows: any = await cRequest(`/api/chat/workspace/files?conversation_id=${id}`)
    const list: FileMeta[] = []
    for (const r of rows || []) {
      const path = String(r.path || '')
      const ext = (path.split('.').pop() || '').toLowerCase()
      const lang = RUNNABLE_EXT[ext]
      // 不再按扩展名过滤：stl/pdf/png/docx 也要能看到
      list.push({
        path,
        lang: lang || ext || 'file',
        label: path.split('/').pop() || path,
        runnable: !!lang,
      })
    }
    fileMeta.value = list
    // 选中项落在文件上时立刻补正文：只有一项的情况下 watch(selected) 不会触发，
    // 否则会看到「标签是 snake.html、代码区一片空白」
    await nextTick()
    void ensureFileContent(blocks.value[selected.value])
  } catch {
    fileMeta.value = []
  }
}

async function ensureFileContent(block: CodeBlock | undefined) {
  if (!block?.path || !props.conversationId) return
  // 预览型文件（3D/图片/PDF）走 URL，不需要把正文拉进内存
  if (block.kind === 'file' && !block.runnable) return
  if (fileContents[block.path] !== undefined) return
  try {
    const row: any = await cRequest(
      `/api/chat/workspace/file?conversation_id=${props.conversationId}&path=${encodeURIComponent(block.path)}`,
    )
    fileContents[block.path] = String(row?.content ?? '')
  } catch {
    fileContents[block.path] = ''
  }
}

const selected = ref(0)

const blocks = computed<CodeBlock[]>(() => {
  const files: CodeBlock[] = fileMeta.value.map((f) => ({
    kind: 'file',
    path: f.path,
    lang: f.lang,
    label: f.label,
    code: f.runnable ? (fileContents[f.path] ?? '') : '',
    // 不可执行的文件不走 textarea，正文永远「已就绪」，避免无谓的懒加载
    partial: f.runnable ? fileContents[f.path] === undefined : false,
    runnable: f.runnable,
    previewUrl: f.runnable ? undefined : inlineUrl(f.path),
  }))
  const msgs = parsedBlocks.value
  if (!files.length) return msgs
  // 同一份代码往往是「正文里贴一遍 + 再写进文件」，只留文件那份，避免重复两个 tab
  const loaded = new Set(files.filter((f) => !f.partial).map((f) => f.code.trim()))
  return [...files, ...msgs.filter((m) => !loaded.has(m.code.trim()))]
})

// 从「没有文件」变成「有文件」时，把焦点给到文件（那是最新产出）
watch(() => fileMeta.value.length, (n, o) => {
  if (!o && n > 0) selected.value = 0
})

watch(() => props.conversationId, () => {
  fileMeta.value = []
  for (const k of Object.keys(fileContents)) delete fileContents[k]
  void reloadFiles()
}, { immediate: true })

// 只在块数量收缩时重置选择，避免流式过程中不断打断用户查看的块
watch(() => blocks.value.length, (n) => {
  if (selected.value >= n) selected.value = 0
})
const current = computed(() => blocks.value[selected.value])

// ============ 可编辑代码 ============
// 未手动编辑时跟随 AI 原文（流式生成、切换代码块都会同步）；
// 一旦用户改过（dirty），就不再用流式内容覆盖，避免打字被打断
const editedCode = ref('')
const dirty = ref(false)

watch(() => current.value?.code, (code) => {
  if (!dirty.value) editedCode.value = code || ''
}, { immediate: true })

watch(selected, () => {
  dirty.value = false
  editedCode.value = current.value?.code || ''
  // 文件块的正文是按需拉的，切过去时补一次
  void ensureFileContent(current.value)
})

function revertCode() {
  dirty.value = false
  editedCode.value = current.value?.code || ''
}

// ============ 全屏预览 ============
const previewFullscreen = ref(false)

function openFullscreen() {
  if (!isHtml.value || !editedCode.value) return
  renderPreview()
  previewFullscreen.value = true
}

/** 标签条上的短语言名（"Python" 占太宽，多块时放不下几个） */
const SHORT_LANG: Record<string, string> = {
  python: 'Py',
  javascript: 'JS',
  html: 'HTML',
  css: 'CSS',
  cpp: 'C++',
  java: 'Java',
  sql: 'SQL',
  pseudocode: '伪码',
}
function shortLabel(lang: string) {
  return SHORT_LANG[lang] || (lang ? lang.toUpperCase().slice(0, 4) : 'code')
}

/** 标签条文字：文件块显示文件名（截断），消息块显示短语言名 */
function tabLabel(b: CodeBlock) {
  if (b.kind === 'file' && b.path) {
    const name = b.path.split('/').pop() || b.path
    return name.length > 14 ? name.slice(0, 13) + '…' : name
  }
  return shortLabel(b.lang)
}

/**
 * 「全部运行」：仅支持同语言的 Python / JavaScript。
 * 拼接执行适合「先定义函数、再调用」这种被拆成多块的回答；
 * 但如果是 main.py + utils.py 的多文件程序，拼接后 import 仍然不通，
 * 那种情况应该让 AI 直接写进工作区（Files 标签）再跑。
 */
const RUN_ALL_LANGS = ['python', 'javascript']
const runAllCandidates = computed(() =>
  blocks.value
    .map((b, i) => ({ block: b, index: i }))
    .filter(({ block }) => RUN_ALL_LANGS.includes(block.lang)),
)
const canRunAll = computed(() => {
  const list = runAllCandidates.value
  if (list.length < 2) return false
  return new Set(list.map(({ block }) => block.lang)).size === 1
})

// ============ HTML 预览（含 css/js 块合并）============
const isHtml = computed(() => current.value?.lang === 'html')
const previewKey = ref(0)
const previewLogs = ref<{ type: string; text: string }[]>([])

/** 把 console/error 桥接到父窗口，让预览面板能看到输出 */
function probeScript(): string {
  // 注意：字符串里不能出现完整的 script 结束标签，否则会截断 SFC / srcdoc
  const close = '<' + '/script>'
  return '<script>(function(){'
    // 预览 iframe 是 sandbox（无 allow-same-origin），访问 localStorage 会抛
    // SecurityError。换成内存实现，否则 AI 生成的代码只要用了 storage 就在
    // 面板里报一片红 —— 而它本来只是存个最高分这种小事。
    + "try{window.localStorage.getItem('__probe__')}catch(e){"
    + 'var m={},f={getItem:function(k){return Object.prototype.hasOwnProperty.call(m,k)?m[k]:null},'
    + 'setItem:function(k,v){m[k]=String(v)},removeItem:function(k){delete m[k]},'
    + 'clear:function(){m={}},key:function(i){return Object.keys(m)[i]||null},'
    + 'get length(){return Object.keys(m).length}};'
    + 'try{Object.defineProperty(window,"localStorage",{configurable:true,get:function(){return f}})}catch(e2){}'
    + '}'
    + 'var S=function(type,args){try{parent.postMessage({__chatPreview:1,type:type,text:Array.prototype.map.call(args,function(a){try{return typeof a==="object"?JSON.stringify(a):String(a)}catch(e){return String(a)}}).join(" ") },"*")}catch(e){}};'
    + 'window.onerror=function(m){S("error",[m])};'
    + '["log","info","warn","error"].forEach(function(k){var o=console[k];console[k]=function(){S(k,arguments);try{o.apply(console,arguments)}catch(e){}}});'
    + '})();' + close
}

const previewDoc = ref('')

function buildPreviewDoc(): string {
  const html = editedCode.value || ''
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

// 全屏预览：ESC 退出
function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape' && previewFullscreen.value) previewFullscreen.value = false
}
onMounted(() => window.addEventListener('keydown', onEsc))
onBeforeUnmount(() => window.removeEventListener('keydown', onEsc))

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

  // 文件块：正文可能还没拉下来，先补齐再跑，否则会跑一段空代码
  if (block.kind === 'file' && block.partial) {
    await ensureFileContent(block)
    await nextTick()
    if (!editedCode.value) return
  }

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
      code: editedCode.value,
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

/** 按顺序拼接所有同语言代码块后执行一次 */
async function runAll() {
  if (running.value) return
  const list = runAllCandidates.value
  if (list.length < 2) return

  const lang = list[0]!.block.lang
  // 当前块若被手动改过，用改后的内容；其余用原文
  const code = list
    .map(({ block, index }) => (index === selected.value ? editedCode.value : block.code))
    .join('\n\n')

  running.value = true
  output.value = ''
  sqlTables.value = []
  sqlError.value = ''
  try {
    const runner = await getRunner(lang)
    if (!runner) {
      output.value = t('chat.unsupported')
      return
    }
    runnerLabel.value = runner.loadingLabel || ''
    await runner.init()
    ready.value = true
    runnerLabel.value = ''
    await runner.run({
      code,
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
  if (!editedCode.value) return
  try {
    await navigator.clipboard.writeText(editedCode.value)
    toast.add({ title: t('chat.copied'), color: 'success' })
  } catch { /* 忽略：非 https 或未授权 */ }
}

defineExpose({ run, reloadFiles })
</script>

<style scoped>
/* 代码块标签条：块多时横向滚动，但不要出现滚动条 */
.chat-tabs {
  scrollbar-width: none;
}
.chat-tabs::-webkit-scrollbar {
  display: none;
}
</style>
