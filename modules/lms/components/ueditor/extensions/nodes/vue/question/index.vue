<template>
  <div class="question-node w-full relative">
    <!-- 内联编辑面板（在上方显示） -->
    <div v-if="showConfig" class="vue-node-config">
      <Edit :question-id="questionId" :question="question" @saved="onSaved" />
    </div>

    <!-- 渲染组件 -->
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

// inject node-view 提供的状态
const showConfig = inject('nodeViewShowConfig', ref(false))
const meta = inject('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))

// 设置组件元信息（告知 node-view 显示设置按钮）
if (meta) {
  meta.title = '题目'
  meta.icon = 'i-lucide-circle-help'
  meta.hasSettings = true
}

const emit = defineEmits(['init'])

const { courseId: ctxCourseId } = useLmsContext()
const chapterTask = useChapterTask()

const questionId = computed(() => Number(props.node?.attrs?.content) || 0)

// 渲染组件引用（用于调用 getQuestionData 等方法）
const renderRef = ref(null)

// 本地 question 状态（用于 Edit 组件，从 Render 组件获取）
const question = ref(null)

// 监听 renderRef 的 question 数据变化
watch(() => renderRef.value?.getQuestionData?.(), (val) => {
  if (val) question.value = val
}, { immediate: true, deep: true })

function onSaved(ques) {
  // 新建题目：拿到新增 cid 后通知父节点更新 content 属性
  if (ques.cid && Number(ques.cid) !== questionId.value) {
    emit('init', ques.cid)
    props.updateAttributes?.({ content: String(ques.cid) })
  }
  // 已有题目：Object.assign 已用表单数据即时更新本地状态，无需重新拉取
  if (question.value) {
    Object.assign(question.value, ques)
  }
  // 编辑保存后关闭配置面板
  if (showConfig.value) {
    showConfig.value = false
  }
}

// 渲染组件提交完成回调
function onSubmitted({ isCorrect, questionId: qid }) {
  // 上报题目完成状态（quiz 模式下由 quiz 统一上报）
  if (!props.inQuiz) {
    chapterTask?.reportNodeDone('question', qid, isCorrect)
  }
}

// ====================== 暴露给 quiz 的方法（透传 render.vue） ======================
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