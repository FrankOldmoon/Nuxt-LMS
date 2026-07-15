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

    // child questionTypeoptionitems（exclude composite）
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

    // child questionEditeditorMap
    const subEditorMap: Record<string, any> = {
        single: SingleEditor, judge: JudgeEditor, multiple: MultipleEditor,
        fill: FillEditor, select: SelectEditor, sort: SortEditor,
        classify: ClassifyEditor, puzzle: PuzzleEditor, html: HtmlEditor,
        'short-answer': ShortAnswerEditor, match: MatchEditor,
    }

    function getSubEditor(type: string) {
        return subEditorMap[type] || null
    }

    // child question list（store form.content Middle）
    const sub-questions = ref<any[]>([])

    // form.content → sub-questions（Initialize + ResponseOutsideexternal change，if AI Generate）
    watch(() => props.form.content, (content) => {
        const val = Array.isArray(content) ? content : []
        if (val !== sub-questions.value) {
            sub-questions.value = val
        }
        // content NoArraywhen，SyncEmptyArrayto form（keepReferenceconsistent）
        if (!Array.isArray(props.form.content)) {
            props.form.content = val
        }
    }, { immediate: true })

    // total score
    const totalPoint = computed(() => {
        return sub-questions.value.reduce((sum, sub) => sum + (Number(sub.point) || 0), 0)
    })

    // Sonwhen question changesSync point and tags to form
    watch([sub-questions, totalPoint], () => {
        // point = child question total score
        props.form.point = totalPoint.value
        // tags = child questionTagandset
        const allTags = new Set()
        sub-questions.value.forEach(sub => {
            (sub.tags || []).forEach(tag => allTags.add(tag))
        })
        props.form.tags = Array.from(allTags)
        // content keepReferenceSync（relativesamewhenSkip，avoidFeedbackcycle）
        if (props.form.content !== sub-questions.value) {
            props.form.content = sub-questions.value
        }
    }, { deep: true, immediate: true })

    function addSub() {
        sub-questions.value.push({
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
        sub-questions.value.splice(idx, 1)
    }

    function onSubTypeChange(idx: number) {
        const sub = sub-questions.value[idx]
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
        sub-questions,
        subTypeOptions,
        totalPoint,
        addSub,
        removeSub,
        getSubEditor,
        onSubTypeChange,
    }
}
