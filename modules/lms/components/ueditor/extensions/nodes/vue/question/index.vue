<template>
  <div class="question-node w-full relative">
    <!-- 内联编辑面板（在上方显示） -->
    <div v-if="showConfig" class="vue-node-config">
      <Edit :question-id="questionId" :question="question" @saved="onSaved" />
    </div>

    <!-- 尚未设置内容（没有 cid）：不渲染空题目，提示先填写并保存 -->
    <div v-if="!questionId"
      class="flex items-start gap-2 p-4 rounded-lg border-2 border-dashed border-red-300 bg-red-50/50 text-sm text-red-500 dark:border-red-800 dark:bg-red-950/20">
      <UIcon name="i-lucide-circle-alert" class="size-4 shrink-0 mt-0.5" />
      <div class="flex-1">
        <p class="font-medium">{{ t('question.unsaved') }}</p>
        <p class="text-xs mt-1 opacity-80">{{ t('question.unsavedHint') }}</p>
      </div>
      <UButton size="2xs" color="primary" variant="soft" icon="i-lucide-settings-2" :label="t('common.edit')"
        @click="showConfig = true" />
    </div>

    <!-- 渲染组件 -->
    <Render v-else ref="renderRef" :node="node" :in-quiz="inQuiz" @submitted="onSubmitted" />
  </div>
</template>

<script setup>
import { ref, computed, inject, reactive, watch } from 'vue'
import Render from './render.vue'
import Edit from './edit.vue'
const { t } = useI18n()

const props = defineProps({
  node: Object,
  inQuiz: { type: Boolean, default: false },
})

// inject node-view 提供的状态
const showConfig = inject('nodeViewShowConfig', ref(false))
const meta = inject('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))

// 设置组件元信息（告知 node-view 显示设置按钮）
if (meta) {
  meta.title = t('question.label')
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