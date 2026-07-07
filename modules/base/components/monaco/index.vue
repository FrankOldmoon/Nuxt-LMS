<template>
    <ClientOnly>
        <div ref="editorContainer" class="w-full h-full min-h-[400px] border border-default rounded overflow-hidden"></div>
        <template #fallback>
            <div class="w-full min-h-[400px] flex items-center justify-center text-muted bg-elevated/30 border border-default rounded">
                {{ $t('common.loading') }}
            </div>
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
    autoFormat: {
        type: Boolean,
        default: true
    },
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

// 格式化：使用 editor.getAction 调用内置格式化命令
async function formatEditorCode() {
    if (!editor || !monaco || !props.autoFormat) return
    const model = editor.getModel()
    if (!model) return

    try {
        const formatAction = editor.getAction('editor.action.formatDocument')
        if (formatAction) {
            await formatAction.run()
            // 格式化后同步回父组件
            const newValue = editor.getValue()
            emit('update:modelValue', newValue)
        }
    } catch (e) {
        // 某些语言可能没有注册格式化器，静默忽略
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
    await nextTick()
    formatEditorCode()
})

watch(() => props.language, (newLang) => {
    if (editor) {
        monaco.editor.setModelLanguage(editor.getModel(), newLang)
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
    formatCode: formatEditorCode
})
</script>
