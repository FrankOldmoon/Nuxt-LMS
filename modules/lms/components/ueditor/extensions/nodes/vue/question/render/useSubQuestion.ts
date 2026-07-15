import { ref, computed, provide, watch } from 'vue'
import { computeCorrectRate } from './shared'
import SingleRender from './single.vue'
import JudgeRender from './judge.vue'
import MultipleRender from './multiple.vue'
import FillRender from './fill.vue'
import SelectRender from './select.vue'
import SortRender from './sort.vue'
import ClassifyRender from './classify.vue'
import PuzzleRender from './puzzle.vue'
import HtmlRender from './html.vue'
import ShortAnswerRender from './short-answer.vue'
import MatchRender from './match.vue'

export function useSubQuestion(props: any, emit: (event: string, ...args: any[]) => void) {
  const { t } = useI18n()

  // unique ID usein DOM Query（fill/select needuseto [data-question-id]）
  const uniqueId = computed(() => 90000 + props.index)

  // localGround question Object（deep clonechild question，independently manage record）
  const localQuestion = ref<any>({})

  function initLocal() {
    localQuestion.value = {
      ...JSON.parse(JSON.stringify(props.subQuestion)),
      record: [],
    }
  }
  initLocal()

  // Sonwhen question changesHeavyNewInitialize
  watch(() => props.subQuestion, () => {
    initLocal()
  }, { deep: true })

  // localGroundStatus
  const submitted = ref(false)
  const isCorrect = ref(false)
  const fromRecord = ref(false)

  provide('question submitted', submitted)
  provide('questionIsCorrect', isCorrect)
  provide('questionFromRecord', fromRecord)

  // Render ComponentMap
  const componentMap: Record<string, any> = {
    single: SingleRender, judge: JudgeRender, multiple: MultipleRender,
    fill: FillRender, select: SelectRender, sort: SortRender,
    classify: ClassifyRender, puzzle: PuzzleRender, html: HtmlRender,
    'short-answer': ShortAnswerRender, match: MatchRender,
  }

  const renderComponent = computed(() => componentMap[props.subQuestion.type] || null)
  const renderRef = ref<any>(null)

  const typeLabel = computed(() => {
    const labels: Record<string, string> = {
      single: t('question.typeSingle'), judge: t('question.typeJudge'),
      multiple: t('question.typeMultiple'), fill: t('question.typeFill'),
      select: t('question.typeSelect'), sort: t('question.typeSort'),
      classify: t('question.typeClassify'), puzzle: t('question.typePuzzle'),
      html: t('question.typeHtml'), 'short-answer': t('question.typeShortAnswer'),
      match: t('question.typeMatch'),
    }
    return labels[props.subQuestion.type] || props.subQuestion.type
  })

  // listen record change，NotificationParent Component
  watch(() => localQuestion.value?.record, (record: any) => {
    if (Array.isArray(record)) {
      emit('answer-change', [...record])
    }
  }, { deep: true })

  // formatAnswerShow
  const formattedAnswer = computed(() => {
    const answer = props.subQuestion.answer || []
    const type = props.subQuestion.type
    if (type === 'single' || type === 'multiple') {
      return answer.map((idx: number) => String.fromCharCode(65 + idx)).join(', ')
    }
    if (type === 'judge') {
      return answer.map((idx: number) => idx === 0 ? t('question.correct') : t('question.wrong')).join(', ')
    }
    return answer.join(', ')
  })

  // exposeMethod
  function submit() {
    if (!renderRef.value) return null
    const result = renderRef.value.submit()
    if (result) {
      submitted.value = true
      fromRecord.value = false
    }
    return result
  }

  function hasAnswer() {
    return renderRef.value?.hasAnswer ?? false
  }

  function fillCorrectAnswer() {
    renderRef.value?.fillCorrectAnswer()
  }

  // Settings record（useinbackfill）：noSettings submitted，byCompositecontrol whenShowjudge
  function setRecord(record: any[]) {
    if (Array.isArray(record) && record.length > 0) {
      localQuestion.value.record = [...record]
      fromRecord.value = true
      const rate = computeCorrectRate(localQuestion.value)
      isCorrect.value = rate >= 1
    }
  }

  // by Parent Componentcontrol judgmentShow
  function applyJudgment() {
    submitted.value = true
  }

  function reset() {
    localQuestion.value.record = []
    submitted.value = false
    isCorrect.value = false
    fromRecord.value = false
    renderRef.value?.reset?.()
  }

  return {
    uniqueId,
    localQuestion,
    submitted,
    isCorrect,
    renderComponent,
    renderRef,
    typeLabel,
    formattedAnswer,
    submit,
    hasAnswer,
    fillCorrectAnswer,
    setRecord,
    applyJudgment,
    reset,
  }
}
