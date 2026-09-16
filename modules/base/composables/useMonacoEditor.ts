/**
 * Monaco Editor：本地 npm 包 + Vite worker 加载 + 初始化 + 格式化
 *
 * 不再走 CDN：动态 import('monaco-editor') 由 Vite 打包进本地产物，
 * 各类语言 worker 通过 Vite 的 ?worker 语法独立分包加载。
 * 动态导入保证在 SSR（服务端）阶段不会执行浏览器相关代码。
 */

// Monaco 全局加载 Promise（单例），避免并发实例重复加载
let monacoLoadPromise: Promise<any> | null = null

function loadMonaco(): Promise<any> {
  if (monacoLoadPromise) return monacoLoadPromise
  if ((window as any).monaco) return Promise.resolve((window as any).monaco)
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Monaco 仅在浏览器环境可用'))
  }

  monacoLoadPromise = (async () => {
    // Monaco 基础样式（ESM 不自动注入，需手动加载；动态导入避免 SSR 污染）
    await import('monaco-editor/min/vs/editor/editor.main.css')
    // 显式指定 ESM 入口（monaco-editor 只有 module 字段，无 main/exports，裸导入无法解析）
    const monaco = await import('monaco-editor/esm/vs/editor/editor.main')

    // 配置各类语言的 Web Worker（本地打包，独立 chunk）
    const [{ default: editorWorker }, { default: jsonWorker }, { default: cssWorker }, { default: htmlWorker }, { default: tsWorker }] = await Promise.all([
      import('monaco-editor/esm/vs/editor/editor.worker?worker'),
      import('monaco-editor/esm/vs/language/json/json.worker?worker'),
      import('monaco-editor/esm/vs/language/css/css.worker?worker'),
      import('monaco-editor/esm/vs/language/html/html.worker?worker'),
      import('monaco-editor/esm/vs/language/typescript/ts.worker?worker'),
    ])

    ;(self as any).MonacoEnvironment = {
      getWorker(_workerId: string, label: string) {
        if (label === 'json') return new jsonWorker()
        if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker()
        if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker()
        if (label === 'typescript' || label === 'javascript') return new tsWorker()
        return new editorWorker()
      },
    }

    ;(window as any).monaco = monaco
    return monaco
  })()

  // 失败时清空缓存以便后续可重试
  monacoLoadPromise.catch(() => { monacoLoadPromise = null })
  return monacoLoadPromise
}

export function useMonacoEditor(
  modelValue: () => string,
  language: () => string,
  theme: () => string,
  readOnly: () => boolean,
  fontSize: () => number,
  autoFormat: () => boolean,
  formatOptions: () => any,
  onUpdate: (val: string) => void,
  onReady: (editor: any) => void,
) {
  const editorContainer = ref<HTMLElement | null>(null)
  let editor: any = null
  let monaco: any = null

  async function formatEditorCode() {
    if (!editor || !monaco || !autoFormat()) return
    const model = editor.getModel()
    if (!model) return

    try {
      const formatAction = editor.getAction('editor.action.formatDocument')
      if (formatAction) {
        await formatAction.run()
        const newValue = editor.getValue()
        onUpdate(newValue)
      }
    } catch (_) { /* 某些语言没有格式化器，静默忽略 */ }
  }

  async function initEditor() {
    monaco = await loadMonaco()

    editor = monaco.editor.create(editorContainer.value, {
      value: modelValue(),
      language: language(),
      theme: theme(),
      readOnly: readOnly(),
      fontSize: fontSize(),
      automaticLayout: true,
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      tabSize: formatOptions().tabSize,
    })

    editor.onDidChangeModelContent(() => {
      onUpdate(editor.getValue())
    })

    onReady(editor)

    nextTick(() => formatEditorCode())
  }

  watch(modelValue, async (newVal) => {
    if (!editor) return
    const current = editor.getValue()
    if (newVal === current) return
    editor.setValue(newVal)
    await nextTick()
    formatEditorCode()
  })

  watch(language, (newLang) => {
    if (editor) {
      monaco.editor.setModelLanguage(editor.getModel(), newLang)
      nextTick(() => formatEditorCode())
    }
  })

  watch(theme, (newTheme) => {
    if (monaco) monaco.editor.setTheme(newTheme)
  })

  onMounted(() => {
    initEditor()
  })

  onBeforeUnmount(() => {
    if (editor) {
      editor.dispose()
      editor = null
    }
  })

  return {
    editorContainer,
    getEditor: () => editor,
    getMonaco: () => monaco,
    formatCode: formatEditorCode,
  }
}