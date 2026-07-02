<template>
    <ClientOnly>
        <div ref="editorContainer" class="monaco-editor-container w-full"></div>
        <template #fallback>
            <div class="monaco-editor-loading">编辑器加载中...</div>
        </template>
    </ClientOnly>
</template>

<script setup>

const props = defineProps({
    modelValue: {
        type: String,
        default: ''
    },
    language: {
        type: String,
        default: 'html' // 支持 javascript, typescript, html, css, json, python, java 等
    },
    theme: {
        type: String,
        default: 'vs-dark' // vs 浅色, vs-dark 深色, hc-black 高对比
    },
    readOnly: {
        type: Boolean,
        default: false
    },
    fontSize: {
        type: Number,
        default: 14
    }
})

const emit = defineEmits(['update:modelValue', 'editorReady'])

const editorContainer = ref(null)
let editor = null
let monaco = null

// CDN 配置
const CDN_BASE = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs'

// 动态加载 CDN 脚本
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

// 加载 Monaco 核心
async function loadMonaco() {
    if (window.monaco) {
        monaco = window.monaco
        return window.monaco
    }

    // 先加载 loader
    await loadScript(`${CDN_BASE}/loader.js`)

    return new Promise((resolve) => {
        window.require.config({ paths: { vs: CDN_BASE } })
        window.require(['vs/editor/editor.main'], () => {
            monaco = window.monaco
            resolve(window.monaco)
        })
    })
}

// 初始化编辑器
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
        tabSize: 2
    })

    // 内容变化事件
    editor.onDidChangeModelContent(() => {
        const value = editor.getValue()
        emit('update:modelValue', value)
    })

    emit('editorReady', editor)
}

// 监听内容变化（外部更新）
watch(() => props.modelValue, (newVal) => {
    if (editor && newVal !== editor.getValue()) {
        editor.setValue(newVal)
    }
})

// 监听语言切换
watch(() => props.language, (newLang) => {
    if (editor) {
        monaco.editor.setModelLanguage(editor.getModel(), newLang)
    }
})

// 监听主题切换
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

// 暴露实例方法
defineExpose({
    getEditor: () => editor,
    getMonaco: () => monaco
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