import { ref, computed, watch } from 'vue'
import SingleEditor from './single.vue'
import JudgeEditor from './judge.vue'
import MultipleEditor from './multiple.vue'
import FillEditor from './fill.vue'
import SelectEditor from './select.vue'
import SortEditor from './sort.vue'
import ClassifyEditor from './classify.vue'
import PuzzleEditor from './puzzle.vue'
import HtmlEditor from './html.vue'
import ShortAnswerEditor from './short-answer.vue'
import MatchEditor from './match.vue'

export function useCompositeEdit(props: { form: any }) {
    const { t } = useI18n()

    // 子题类型选项（排除 composite）
    const subTypeOptions = computed(() => [
        { label: t('question.typeSingle'), value: 'single' },
        { label: t('question.typeJudge'), value: 'judge' },
        { label: t('question.typeMultiple'), value: 'multiple' },
        { label: t('question.typeFill'), value: 'fill' },
        { label: t('question.typeSelect'), value: 'select' },
        { label: t('question.typeSort'), value: 'sort' },
        { label: t('question.typeClassify'), value: 'classify' },
        { label: t('question.typePuzzle'), value: 'puzzle' },
        { label: t('question.typeHtml'), value: 'html' },
        { label: t('question.typeShortAnswer'), value: 'short-answer' },
        { label: t('question.typeMatch'), value: 'match' },
    ])

    // 子题编辑器映射
    const subEditorMap: Record<string, any> = {
        single: SingleEditor, judge: JudgeEditor, multiple: MultipleEditor,
        fill: FillEditor, select: SelectEditor, sort: SortEditor,
        classify: ClassifyEditor, puzzle: PuzzleEditor, html: HtmlEditor,
        'short-answer': ShortAnswerEditor, match: MatchEditor,
    }

    function getSubEditor(type: string) {
        return subEditorMap[type] || null
    }

    // 子题列表（存储在 form.content 中）
    const subQuestions = ref<any[]>([])

    // form.content → subQuestions（初始化 + 响应外部变更，如 AI 生成）
    watch(() => props.form.content, (content) => {
        const val = Array.isArray(content) ? content : []
        if (val !== subQuestions.value) {
            subQuestions.value = val
        }
        // content 不是数组时，同步空数组到 form（保持引用一致）
        if (!Array.isArray(props.form.content)) {
            props.form.content = val
        }
    }, { immediate: true })

    // 总分
    const totalPoint = computed(() => {
        return subQuestions.value.reduce((sum, sub) => sum + (Number(sub.point) || 0), 0)
    })

    // 子题变化时同步 point 和 tags 到 form
    watch([subQuestions, totalPoint], () => {
        // point = 子题总分
        props.form.point = totalPoint.value
        // tags = 子题标签的并集
        const allTags = new Set()
        subQuestions.value.forEach(sub => {
            (sub.tags || []).forEach(tag => allTags.add(tag))
        })
        props.form.tags = Array.from(allTags)
        // content 保持引用同步（相同时跳过，避免反馈环）
        if (props.form.content !== subQuestions.value) {
            props.form.content = subQuestions.value
        }
    }, { deep: true, immediate: true })

    function addSub() {
        subQuestions.value.push({
            type: 'single',
            name: '',
            content: '',
            options: ['', '', '', ''],
            answer: [0],
            point: 1,
            tags: [],
            explanation: '',
        })
    }

    function removeSub(idx: number) {
        subQuestions.value.splice(idx, 1)
    }

    function onSubTypeChange(idx: number) {
        const sub = subQuestions.value[idx]
        if (!sub) return
        switch (sub.type) {
            case 'judge':
                sub.options = [t('question.correct'), t('question.wrong')]
                sub.answer = [0]
                break
            case 'fill':
                sub.options = []
                sub.answer = []
                break
            case 'single':
                sub.options = ['', '', '', '']
                sub.answer = [0]
                break
            case 'multiple':
                sub.options = ['', '', '', '']
                sub.answer = []
                break
            case 'select':
                sub.options = []
                sub.answer = []
                break
            case 'sort':
                sub.options = ['', '', '']
                sub.answer = [0, 1, 2]
                break
            case 'classify':
                sub.options = [{ name: '', items: ['', ''] }, { name: '', items: ['', ''] }]
                sub.answer = [0, 0, 1, 1]
                break
            case 'puzzle':
                sub.options = { url: '', split: 3 }
                sub.answer = [0, 1, 2, 3, 4, 5, 6, 7, 8]
                break
            case 'html':
                sub.options = []
                sub.answer = [1]
                sub.content = ''
                break
            case 'short-answer':
                sub.options = []
                sub.answer = ['']
                break
            case 'match':
                sub.options = [{ left: '', right: '' }, { left: '', right: '' }]
                sub.answer = [0, 1]
                break
        }
    }

    return {
        subQuestions,
        subTypeOptions,
        totalPoint,
        addSub,
        removeSub,
        getSubEditor,
        onSubTypeChange,
    }
}
