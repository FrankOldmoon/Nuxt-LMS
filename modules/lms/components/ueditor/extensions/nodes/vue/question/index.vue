<template>
  <div class="question-node w-full relative">
    <!-- InsideinlineEditPanel（UpsideShow） -->
    <div v-if="showConfig" class="vue-node-config">
      <Edit :question-id="questionId" :question="question" @saved="onSaved" />
    </div>

    <!-- Render Component -->
    <Render ref="renderRef" :node="node" :in-quiz="inQuiz" @submitted="onSubmitted" />
  </div>
</template>

<script setup>
import { ref, computed, inject, reactive, watch } from 'vue'
import Render from './render.vue'
import Edit from './edit.vue'

const props = defineProps({
  node: Object,
  inQuiz: { type: Boolean, default: false },
})

// inject node-view provideStatus
const showConfig = inject('nodeViewShowConfig', ref(false))
const meta = inject('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))

// SettingsComponentelementInfo（informNode-view ShowSettingsButton）
if (meta) {
  meta.title = 'Question'
  meta.icon = 'i-lucide-circle-help'
  meta.hasSettings = true
}

const emit = defineEmits(['init'])

const { courseId: ctxCourseId } = useLmsContext()
const chapterTask = useChapterTask()

const questionId = computed(() => Number(props.node?.attrs?.content) || 0)

// Render Component reference（useinCall getQuestionData etc.Method）
const renderRef = ref(null)

// localGround question Status（usein Edit Component，from Render ComponentGet）
const question = ref(null)

// listen renderRef  question Datachange
watch(() => renderRef.value?.getQuestionData?.(), (val) => {
  if (val) question.value = val
}, { immediate: true, deep: true })

function onSaved(ques) {
  // New Question：taketoAdd cid BackNotificationparent nodePointUpdate content Property
  if (ques.cid && Number(ques.cid) !== questionId.value) {
    emit('init', ques.cid)
    props.updateAttributes?.({ content: String(ques.cid) })
  }
  // alreadyHasQuestion：Object.assign alreadyuseForm Datathat iswhenUpdatelocalGroundStatus，NoneneedHeavyNewfetch
  if (question.value) {
    Object.assign(question.value, ques)
  }
  // EditSaveBackCloseConfigurationPanel
  if (showConfig.value) {
    showConfig.value = false
  }
}

// Render ComponentSubmittedCallback
function onSubmitted({ isCorrect, questionId: qid }) {
  // UpreportQuestionCompleteStatus（quiz mode downby quiz unifyUpreport）
  if (!props.inQuiz) {
    chapterTask?.reportNodeDone('question', qid, isCorrect)
  }
}

// ====================== exposeto quiz Method（pass through render.vue） ======================
defineExpose({
  getQuestionData() {
    return renderRef.value?.getQuestionData?.() || null
  },
  fillFromRecord(record, rate) {
    renderRef.value?.fillFromRecord?.(record, rate)
  },
  showResult() {
    return renderRef.value?.showResult?.() || { rate: 0, record: [] }
  },
  resetForQuiz() {
    renderRef.value?.resetForQuiz?.()
  },
  get hasAnswer() {
    return renderRef.value?.hasAnswer ?? false
  },
  get data() {
    return question.value
  },
})
</script>