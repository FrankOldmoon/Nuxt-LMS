import { createPythonRunner } from '../components/ide/runners/python'
import { createJavascriptRunner } from '../components/ide/runners/javascript'
import { createCppRunner } from '../components/ide/runners/cpp'
import { createJavaRunner } from '../components/ide/runners/java'
import { createPseudocodeRunner, pseudocodeToPython, pythonToPseudocode } from '../components/ide/runners/pseudocode'
import { createSqlRunner } from '../components/ide/runners/sql'
import { monacoLang, type LanguageId, type Runner, type SqlResultTable } from '../components/ide/runners/types'

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
  pseudocode: `OUTPUT "Hello, World"`,
  sql: `-- Welcome to SQL IDE
DROP TABLE students;
CREATE TABLE students (id INTEGER, name TEXT, score INTEGER);
INSERT INTO students VALUES (1, 'Alice', 92);
INSERT INTO students VALUES (2, 'Bob', 78);
INSERT INTO students VALUES (3, 'Carol', 88);
SELECT name, score FROM students ORDER BY score DESC;
`,
}

const LANGS: LanguageId[] = ['python', 'javascript', 'cpp', 'java', 'pseudocode', 'sql']

const FACTORIES: Record<LanguageId, () => Runner> = {
  python: createPythonRunner,
  javascript: createJavascriptRunner,
  cpp: createCppRunner,
  java: createJavaRunner,
  pseudocode: createPseudocodeRunner,
  sql: createSqlRunner,
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
    { label: t('ide.langPseudocode'), value: 'pseudocode' },
    { label: t('ide.langSql'), value: 'sql' },
  ])

  const currentLang = ref<LanguageId>(
    LANGS.includes(language() as LanguageId) ? (language() as LanguageId) : 'python',
  )
  const monacoLanguage = computed(() => monacoLang(currentLang.value))

  // 是否为伪代码模式（左右分栏：左伪代码 / 右 Python 预览）
  const isPseudoCode = computed(() => currentLang.value === 'pseudocode')

  // 伪代码模式：左侧伪代码（code）+ 右侧 Python（pseudoPython），均可编辑
  // 提供两个方向的手动转换函数；不做自动覆盖，避免覆盖用户正在编辑的一侧
  const pseudoPython = ref('')
  const pseudoErr = ref('')

  /** 左侧伪代码 → 右侧 Python */
  function syncPseudoToPy() {
    try {
      pseudoPython.value = pseudocodeToPython(code.value)
      pseudoErr.value = ''
    } catch (e: any) {
      pseudoErr.value = `Pseudocode parse error: ${e.message || e}`
    }
  }
  /** 右侧 Python → 左侧伪代码 */
  function syncPyToPseudo() {
    try {
      code.value = pythonToPseudocode(pseudoPython.value)
      pseudoErr.value = ''
      onUpdate(code.value)
    } catch (e: any) {
      pseudoErr.value = `Python parse error: ${e.message || e}`
    }
  }

  // 是否为 SQL 模式（隐藏 input/output，改用多张结果表展示查询结果）
  const isSql = computed(() => currentLang.value === 'sql')
  const sqlTables = ref<SqlResultTable[]>([])
  const sqlError = ref('')

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

  // 伪代码模式：进入时把左侧伪代码同步到右侧 Python 作为起始预览
  watch(isPseudoCode, (val, old) => {
    if (val && !old) syncPseudoToPy()
  })

  // 切换语言：保存当前代码、载入目标代码、懒初始化 runner
  watch(currentLang, (newLang, oldLang) => {
    if (oldLang) codeByLang[oldLang] = code.value
    code.value = codeByLang[newLang] ?? DEFAULT_CODE[newLang]
    onUpdate(code.value)
    output.value = ''
    sqlTables.value = []
    sqlError.value = ''
    getRunner(newLang)
  })

  // ========== 运行代码 ==========
  async function runCode() {
    const runner = currentRunner.value
    if (!runner || !runner.ready.value || running.value) return
    running.value = true
    output.value = ''
    sqlTables.value = []
    sqlError.value = ''
    try {
      await runner.run({
        code: code.value,
        input: inputText.value,
        onOutput: (text) => { output.value += text },
        onResults: (tables) => { sqlTables.value = tables },
        onError: (message) => { sqlError.value = message },
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
    isPseudoCode,
    pseudoPython,
    pseudoErr,
    syncPseudoToPy,
    syncPyToPseudo,
    isSql,
    sqlTables,
    sqlError,
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
