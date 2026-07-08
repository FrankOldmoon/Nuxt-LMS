<template>
    <div class="ide-container">
        <!-- 顶部工具栏 -->
        <div class="ide-toolbar">
            <div class="flex items-center gap-2">
                <UIcon name="i-lucide-terminal" class="text-gray-500" />
                <span class="text-sm font-medium">{{ t('ide.title') }}</span>
                <UBadge v-if="runnerReady" variant="success" size="sm">{{ t('ide.ready') }}</UBadge>
                <UBadge v-else variant="warning" size="sm">{{ currentRunner?.loadingLabel || t('ide.loading') }}</UBadge>
            </div>
            <div class="flex items-center gap-2">
                <USelect
                    v-model="currentLang"
                    :items="langItems"
                    size="xs"
                    class="w-36"
                />
                <UButton
                    icon="i-lucide-play"
                    color="primary"
                    size="xs"
                    :loading="running"
                    :disabled="!runnerReady || running"
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
                :language="monacoLanguage"
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createPythonRunner } from './runners/python'
import { createJavascriptRunner } from './runners/javascript'
import { createCppRunner } from './runners/cpp'
import { createJavaRunner } from './runners/java'
import { monacoLang } from './runners/types'

const { t } = useI18n()

const props = defineProps({
    modelValue: { type: String, default: '' },
    language: { type: String, default: 'python' },
})

const emit = defineEmits(['update:modelValue'])

// ========== 各语言默认示例代码 ==========
const DEFAULT_CODE = {
    python: `# Welcome to Python IDE
import sys

print("Hello, Pyodide!")
print(f"Python version: {sys.version}")

# Try some math
for i in range(5):
    print(f"  {i} squared = {i**2}")
`,
    javascript: `// Welcome to JavaScript IDE
console.log("Hello, JavaScript!");

// Try some math
for (let i = 0; i < 5; i++) {
  console.log(\`  \${i} squared = \${i ** 2}\`);
}
`,
    cpp: `// Welcome to C++ IDE (JSCPP interpreter, limited STL support)
#include <iostream>
using namespace std;

int main() {
    cout << "Hello, C++!" << endl;
    for (int i = 0; i < 5; i++) {
        cout << "  " << i << " squared = " << i * i << endl;
    }
    return 0;
}
`,
    java: `// Welcome to Java IDE (Pure JS interpreter, AP CS A syntax)
import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        // Variables, loops, arrays
        int[] a = {3, 1, 4, 1, 5, 9, 2, 6};
        int sum = 0;
        for (int i = 0; i < a.length; i++) {
            sum += a[i];
        }
        System.out.println("sum = " + sum);

        // ArrayList + enhanced for
        ArrayList<String> list = new ArrayList<>();
        list.add("apple");
        list.add("banana");
        list.add("cherry");
        for (String s : list) {
            System.out.println(s);
        }
    }
}
`,
}

// ========== 语言选择 ==========
const LANGS = ['python', 'javascript', 'cpp', 'java']
const langItems = computed(() => [
    { label: t('ide.langPython'), value: 'python' },
    { label: t('ide.langJavascript'), value: 'javascript' },
    { label: t('ide.langCpp'), value: 'cpp' },
    { label: t('ide.langJava'), value: 'java' },
])

const currentLang = ref(LANGS.includes(props.language) ? props.language : 'python')
const monacoLanguage = computed(() => monacoLang(currentLang.value))

// 每种语言独立保存代码，切换语言时保留各自编辑内容
const codeByLang = {}
LANGS.forEach((l) => { codeByLang[l] = DEFAULT_CODE[l] })
// 初始语言若有外部传入代码，覆盖该语言默认值
if (props.modelValue) {
    codeByLang[currentLang.value] = props.modelValue
}
const code = ref(codeByLang[currentLang.value])

const inputText = ref('')
const output = ref('')
const running = ref(false)

// ========== Runner 工厂表 + 懒创建 ==========
const FACTORIES = {
    python: createPythonRunner,
    javascript: createJavascriptRunner,
    cpp: createCppRunner,
    java: createJavaRunner,
}
const runners = {}
// runners 是普通对象，新增 runner 时需要触发响应式更新
const runnersVersion = ref(0)
const currentRunner = computed(() => {
    runnersVersion.value  // 依赖：runner 新增时递增触发重算
    return runners[currentLang.value]
})
const runnerReady = computed(() => currentRunner.value?.ready.value ?? false)

function getRunner(lang) {
    if (!runners[lang]) {
        runners[lang] = FACTORIES[lang]()
        runnersVersion.value++  // 触发 currentRunner 重算
        // 后台预加载运行时
        runners[lang].init().catch((e) => {
            output.value = t('ide.loadFailed', { msg: e.message })
        })
    }
    return runners[lang]
}

// ========== v-model 同步 ==========
watch(code, (val) => {
    codeByLang[currentLang.value] = val
    emit('update:modelValue', val)
})
watch(() => props.modelValue, (val) => {
    if (val !== undefined && val !== code.value) {
        code.value = val
        codeByLang[currentLang.value] = val
    }
})

// 切换语言：保存当前代码、载入目标代码、懒初始化 runner
watch(currentLang, (newLang, oldLang) => {
    if (oldLang) codeByLang[oldLang] = code.value
    code.value = codeByLang[newLang] ?? DEFAULT_CODE[newLang]
    emit('update:modelValue', code.value)
    output.value = ''
    getRunner(newLang)
})

// ========== 运行代码 ==========
async function runCode() {
    const runner = currentRunner.value
    if (!runner || !runner.ready.value || running.value) return
    running.value = true
    output.value = ''
    try {
        await runner.run({
            code: code.value,
            input: inputText.value,
            onOutput: (text) => { output.value += text },
        })
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
    getRunner(currentLang.value)
})

onBeforeUnmount(() => {
    Object.values(runners).forEach((r) => r.cleanup?.())
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
