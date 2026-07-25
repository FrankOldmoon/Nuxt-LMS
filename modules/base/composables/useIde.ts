import { createPythonRunner } from '../components/ide/runners/python'
import { createJavascriptRunner } from '../components/ide/runners/javascript'
import { createCppRunner } from '../components/ide/runners/cpp'
import { createJavaRunner } from '../components/ide/runners/java'
import { monacoLang, type LanguageId, type Runner } from '../components/ide/runners/types'

// ========== 各语言默认示例代码 ==========
const DEFAULT_CODE: Record<LanguageId, string> = {
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

const LANGS: LanguageId[] = ['python', 'javascript', 'cpp', 'java']

const FACTORIES: Record<LanguageId, () => Runner> = {
  python: createPythonRunner,
  javascript: createJavascriptRunner,
  cpp: createCppRunner,
  java: createJavaRunner,
}

/**
 * 在线 IDE：多语言代码编辑 + 运行
 */
export function useIde(
  modelValue: () => string | undefined,
  language: () => string,
  onUpdate: (value: string) => void,
) {
  const { t } = useI18n()

  const langItems = computed(() => [
    { label: t('ide.langPython'), value: 'python' },
    { label: t('ide.langJavascript'), value: 'javascript' },
    { label: t('ide.langCpp'), value: 'cpp' },
    { label: t('ide.langJava'), value: 'java' },
  ])

  const currentLang = ref<LanguageId>(
    LANGS.includes(language() as LanguageId) ? (language() as LanguageId) : 'python',
  )
  const monacoLanguage = computed(() => monacoLang(currentLang.value))

  // 每种语言独立保存代码，切换语言时保留各自编辑内容
  const codeByLang: Record<string, string> = {}
  LANGS.forEach((l) => { codeByLang[l] = DEFAULT_CODE[l] })
  if (modelValue()) {
    codeByLang[currentLang.value] = modelValue()!
  }
  const code = ref<string>(codeByLang[currentLang.value] ?? '')

  const inputText = ref('')
  const output = ref('')
  const running = ref(false)

  // ========== Runner 懒创建 ==========
  const runners: Record<string, Runner> = {}
  const runnersVersion = ref(0)
  const currentRunner = computed(() => {
    runnersVersion.value // 依赖：runner 新增时递增触发重算
    return runners[currentLang.value]
  })
  const runnerReady = computed(() => currentRunner.value?.ready.value ?? false)

  function getRunner(lang: LanguageId) {
    if (!runners[lang]) {
      runners[lang] = FACTORIES[lang]()
      runnersVersion.value++ // 触发 currentRunner 重算
      runners[lang].init().catch((e: any) => {
        output.value = t('ide.loadFailed', { msg: e.message })
      })
    }
    return runners[lang]
  }

  // ========== v-model 同步 ==========
  watch(code, (val) => {
    codeByLang[currentLang.value] = val
    onUpdate(val)
  })
  watch(modelValue, (val) => {
    if (val !== undefined && val !== code.value) {
      code.value = val
      codeByLang[currentLang.value] = val
    }
  })

  // 切换语言：保存当前代码、载入目标代码、懒初始化 runner
  watch(currentLang, (newLang, oldLang) => {
    if (oldLang) codeByLang[oldLang] = code.value
    code.value = codeByLang[newLang] ?? DEFAULT_CODE[newLang]
    onUpdate(code.value)
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
    } catch (e: any) {
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

  return {
    t,
    langItems,
    currentLang,
    monacoLanguage,
    code,
    inputText,
    output,
    running,
    currentRunner,
    runnerReady,
    runCode,
    clearOutput,
  }
}
