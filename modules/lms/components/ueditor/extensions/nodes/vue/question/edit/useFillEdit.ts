import { ref, computed, watch } from 'vue'

export function useFillEdit(props: { form: any }) {
    const { t } = useI18n()

    const fillHintText = computed(() => t('question.fillAnswerHint'))

    // regex marker：andAnswerone-to-oneRightshould，markWhichsomeEmptymakeuseregex judgment
    const regexFlags = ref<any[]>([])
    // regexTestInput
    const testInputs = ref<any[]>([])

    const hasRegex = computed(() => regexFlags.value.some(v => v))

    // from content MiddleextractAnswer
    const parsedAnswers = computed(() => {
        const content = props.form.content
        if (typeof content === 'string') {
            // charactersstring format：from {{}} MiddleextractAnswer
            const matches = content.match(/\{\{(.+?)\}\}/g)
            if (!matches) return []
            return matches.map(m => m.replace(/^\{\{|\}\}$/g, '').trim())
        } else if (content && typeof content === 'object') {
            // UEditor JSON format：extract type  inputs nodePoint attrs.content asAnswer
            return extractAnswersFromDoc(content)
        }
        return []
    })

    // Syncto form.answer and form.options（options store regex markers）
    watch(parsedAnswers, (answers) => {
        // preservealreadyHasmark，completeLength
        const oldFlags = [...regexFlags.value]
        regexFlags.value = answers.map((_, i) => oldFlags[i] || false)
        testInputs.value = answers.map((_, i) => testInputs.value[i] || '')
        props.form.answer = answers
        props.form.options = regexFlags.value.map(f => f ? 'regex' : '')
    }, { immediate: true })

    // listen form.options regex markers for backfill（EditalreadyHasQuestionwhen）
    watch(() => props.form.options, (opts) => {
        if (Array.isArray(opts) && opts.length === regexFlags.value.length) {
            regexFlags.value = opts.map(v => v === 'regex')
        }
    }, { immediate: true })

    function onRegexToggle(idx: number, val: any) {
        // TriggerSync
        props.form.options = regexFlags.value.map(f => f ? 'regex' : '')
    }

    // regexTestresult
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

        // IfYes inputs nodePoint，extract attrs.content asAnswer
        if (node.type === 'inputs' && node.attrs && node.attrs.content) {
            answers.push(node.attrs.content)
        }

        // recursiveHandlechild nodePoint
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
