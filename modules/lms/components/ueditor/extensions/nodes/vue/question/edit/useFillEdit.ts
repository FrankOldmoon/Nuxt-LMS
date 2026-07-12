import { ref, computed, watch } from 'vue'

export function useFillEdit(props: { form: any }) {
    const { t } = useI18n()

    const fillHintText = computed(() => t('question.fillAnswerHint'))

    // 正则标记：与答案一一对应，标记哪些空使用正则判断
    const regexFlags = ref<any[]>([])
    // 正则测试输入
    const testInputs = ref<any[]>([])

    const hasRegex = computed(() => regexFlags.value.some(v => v))

    // 从 content 中提取答案
    const parsedAnswers = computed(() => {
        const content = props.form.content
        if (typeof content === 'string') {
            // 字符串格式：从 {{}} 中提取答案
            const matches = content.match(/\{\{(.+?)\}\}/g)
            if (!matches) return []
            return matches.map(m => m.replace(/^\{\{|\}\}$/g, '').trim())
        } else if (content && typeof content === 'object') {
            // UEditor JSON 格式：提取 type 为 inputs 的节点的 attrs.content 作为答案
            return extractAnswersFromDoc(content)
        }
        return []
    })

    // 同步到 form.answer 和 form.options（options 存正则标记）
    watch(parsedAnswers, (answers) => {
        // 保留已有标记，补齐长度
        const oldFlags = [...regexFlags.value]
        regexFlags.value = answers.map((_, i) => oldFlags[i] || false)
        testInputs.value = answers.map((_, i) => testInputs.value[i] || '')
        props.form.answer = answers
        props.form.options = regexFlags.value.map(f => f ? 'regex' : '')
    }, { immediate: true })

    // 监听 form.options 回填正则标记（编辑已有题目时）
    watch(() => props.form.options, (opts) => {
        if (Array.isArray(opts) && opts.length === regexFlags.value.length) {
            regexFlags.value = opts.map(v => v === 'regex')
        }
    }, { immediate: true })

    function onRegexToggle(idx: number, val: any) {
        // 触发同步
        props.form.options = regexFlags.value.map(f => f ? 'regex' : '')
    }

    // 正则测试结果
    const testResults = computed(() => {
        return parsedAnswers.value.map((ans, idx) => {
            if (!regexFlags.value[idx] || !testInputs.value[idx]) return false
            try {
                return new RegExp(ans).test(testInputs.value[idx])
            } catch {
                return false
            }
        })
    })

    function extractAnswersFromDoc(node: any) {
        const answers: any[] = []
        if (!node) return answers

        // 如果是 inputs 节点，提取 attrs.content 作为答案
        if (node.type === 'inputs' && node.attrs && node.attrs.content) {
            answers.push(node.attrs.content)
        }

        // 递归处理子节点
        if (node.content && Array.isArray(node.content)) {
            for (const child of node.content) {
                answers.push(...extractAnswersFromDoc(child))
            }
        }

        return answers
    }

    return {
        fillHintText,
        regexFlags,
        testInputs,
        hasRegex,
        parsedAnswers,
        testResults,
        onRegexToggle,
    }
}
