<template>
    <ClientOnly>
        <div ref="editorContainer" class="monaco-editor-container w-full"></div>
        <template #fallback>
            <div class="monaco-editor-loading">编辑器加载中...</div>
        </template>
    </ClientOnly>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
    modelValue: {
        type: String,
        default: ''
    },
    language: {
        type: String,
        default: 'html'
    },
    theme: {
        type: String,
        default: 'vs-dark'
    },
    readOnly: {
        type: Boolean,
        default: false
    },
    fontSize: {
        type: Number,
        default: 14
    },
    // 新增：是否自动格式化
    autoFormat: {
        type: Boolean,
        default: true
    },
    // 格式化配置（缩进等）
    formatOptions: {
        type: Object,
        default: () => ({
            tabSize: 2,
            insertSpaces: true,
            trimTrailingWhitespace: true,
            insertFinalNewline: true
        })
    }
})

const emit = defineEmits(['update:modelValue', 'editorReady'])

const editorContainer = ref(null)
let editor = null
let monaco = null

const CDN_BASE = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs'

function loadScript(url) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${url}"]`)) {
            resolve()
            return
        }
        const script = document.createElement('script')
        script.src = url
        script.onload = resolve
        script.onerror = reject
        document.head.appendChild(script)
    })
}

async function loadMonaco() {
    if (window.monaco) {
        monaco = window.monaco
        return window.monaco
    }

    await loadScript(`${CDN_BASE}/loader.js`)

    return new Promise((resolve) => {
        window.require.config({ paths: { vs: CDN_BASE } })
        window.require(['vs/editor/editor.main'], () => {
            monaco = window.monaco
            resolve(window.monaco)
        })
    })
}

// 封装格式化函数
async function formatEditorCode() {
    if (!editor || !monaco || !props.autoFormat) return
    const model = editor.getModel()
    if (!model) return

    // 获取格式化操作
    const edits = await monaco.languages.formatDocument(model, props.formatOptions)
    if (edits && edits.length) {
        const oldValue = editor.getValue()
        // 应用格式化
        model.applyEdits(edits)
        const newValue = editor.getValue()
        // 格式化后同步回父组件
        if (newValue !== oldValue) {
            emit('update:modelValue', newValue)
        }
    }
}

async function initEditor() {
    await loadMonaco()

    editor = monaco.editor.create(editorContainer.value, {
        value: props.modelValue,
        language: props.language,
        theme: props.theme,
        readOnly: props.readOnly,
        fontSize: props.fontSize,
        automaticLayout: true,
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        tabSize: props.formatOptions.tabSize
    })

    editor.onDidChangeModelContent(() => {
        const value = editor.getValue()
        emit('update:modelValue', value)
    })

    emit('editorReady', editor)

    // 初始化完成后延迟格式化（等待语言加载完成）
    nextTick(() => formatEditorCode())
}

// 外部传入值变化，更新并格式化
watch(() => props.modelValue, async (newVal, oldVal) => {
    if (!editor) return
    const current = editor.getValue()
    if (newVal === current) return

    editor.setValue(newVal)
    // 赋值后自动格式化
    await nextTick()
    formatEditorCode()
})

watch(() => props.language, (newLang) => {
    if (editor) {
        monaco.editor.setModelLanguage(editor.getModel(), newLang)
        // 切换语言后重新格式化
        nextTick(() => formatEditorCode())
    }
})

watch(() => props.theme, (newTheme) => {
    if (monaco) {
        monaco.editor.setTheme(newTheme)
    }
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

defineExpose({
    getEditor: () => editor,
    getMonaco: () => monaco,
    // 暴露手动格式化方法，父组件可调用
    formatCode: formatEditorCode
})
</script>

<style scoped>
.monaco-editor-container {
    width: 100%;
    height: 100%;
    min-height: 400px;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
}

.monaco-editor-loading {
    width: 100%;
    min-height: 400px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6b7280;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
}
</style>