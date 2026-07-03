<template>
    <div class="ide-container">
        <!-- 顶部工具栏 -->
        <div class="ide-toolbar">
            <div class="flex items-center gap-2">
                <UIcon name="i-lucide-terminal" class="text-gray-500" />
                <span class="text-sm font-medium">Python IDE</span>
                <UBadge v-if="pyodideReady" variant="success" size="sm">Pyodide Ready</UBadge>
                <UBadge v-else variant="warning" size="sm">Loading Pyodide...</UBadge>
            </div>
            <div class="flex items-center gap-2">
                <UButton
                    icon="i-lucide-play"
                    color="primary"
                    size="xs"
                    :loading="running"
                    :disabled="!pyodideReady || running"
                    @click="runCode"
                >
                    {{ t('ide.run') }}
                </UButton>
                <UButton
                    icon="i-lucide-eraser"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    @click="clearOutput"
                >
                    {{ t('ide.clear') }}
                </UButton>
            </div>
        </div>

        <!-- 上方：Monaco 编辑器（80%） -->
        <div class="ide-editor-area">
            <Monaco
                v-model="code"
                language="python"
                theme="vs-dark"
                :font-size="14"
            />
        </div>

        <!-- 下方：输入框 + 输出框（20%） -->
        <div class="ide-bottom-area">
            <!-- 左下：输入框 -->
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

            <!-- 右下：输出框 -->
            <div class="ide-output-panel">
                <div class="ide-panel-header">
                    <UIcon name="i-lucide-monitor" class="size-3.5 text-gray-400" />
                    <span class="text-xs text-gray-400">{{ t('ide.output') }}</span>
                </div>
                <pre class="ide-output-content">{{ output }}</pre>
            </div>
        </div>
    </div>
</template>

<script setup>
const { t } = useI18n()

const props = defineProps({
    modelValue: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

const code = ref(props.modelValue || `# Welcome to Python IDE
import sys

print("Hello, Pyodide!")
print(f"Python version: {sys.version}")

# Try some math
for i in range(5):
    print(f"  {i} squared = {i**2}")
`)
const inputText = ref('')
const output = ref('')
const running = ref(false)
const pyodideReady = ref(false)
let pyodide = null

watch(code, (val) => {
    emit('update:modelValue', val)
})
watch(() => props.modelValue, (val) => {
    if (val !== undefined && val !== code.value) {
        code.value = val
    }
})

// ========== Pyodide 加载 ==========
const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/'

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

async function loadPyodide() {
    if (window.loadPyodide) {
        pyodide = await window.loadPyodide({ indexURL: PYODIDE_CDN })
        pyodideReady.value = true
        return
    }
    await loadScript(PYODIDE_CDN + 'pyodide.js')
    pyodide = await window.loadPyodide({ indexURL: PYODIDE_CDN })
    pyodideReady.value = true
}

// ========== 运行代码 ==========
async function runCode() {
    if (!pyodideReady.value || running.value) return
    running.value = true
    output.value = ''

    try {
        pyodide.setStdout({ batched: (text) => { output.value += text + '\n' } })
        pyodide.setStderr({ batched: (text) => { output.value += text + '\n' } })

        const inputLines = inputText.value.split('\n')
        let inputIndex = 0
        pyodide.setStdin({
            stdin: () => {
                if (inputIndex < inputLines.length) {
                    return inputLines[inputIndex++]
                }
                return null
            },
        })

        await pyodide.runPythonAsync(code.value)
    } catch (e) {
        output.value += `\n${e.message || e}\n`
    } finally {
        running.value = false
    }
}

function clearOutput() {
    output.value = ''
}

onMounted(() => {
    loadPyodide().catch((e) => {
        output.value = `Pyodide 加载失败: ${e.message}`
    })
})
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
.ide-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    background: #252526;
    border-bottom: 1px solid #3c3c3c;
    flex-shrink: 0;
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
.ide-input-panel,
.ide-output-panel {
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
.ide-output-content {
    flex: 1;
    overflow: auto;
    padding: 8px;
    margin: 0;
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 13px;
    color: #d4d4d4;
    background: #1e1e1e;
    white-space: pre-wrap;
    word-break: break-word;
}
</style>
