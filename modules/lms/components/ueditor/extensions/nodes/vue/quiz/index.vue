<template>
    <div class="quiz-render w-full relative">
        <!-- 内联编辑面板（在上方显示） -->
        <div v-if="showConfig" class="vue-node-config">
            <Edit :quiz-id="quizId" :quiz="quiz" :course-id="courseId" @saved="onSaved" />
        </div>

        <Render ref="renderRef" :node="node" :course-id="courseId" @saved="onSaved" />
    </div>
</template>

<script setup>
import { reactive, ref, inject, computed, watch } from 'vue'
import { nodeViewProps } from '@tiptap/vue-3'
import Render from './render.vue'
import Edit from './edit.vue'

const props = defineProps(nodeViewProps)

import { inject as injectCourseId } from 'vue'
const injectedCourseId = injectCourseId('renderCourseId', undefined)
const { editableCourseId } = useLayoutState()
const courseId = computed(() => {
  if (injectedCourseId !== undefined && injectedCourseId !== null && injectedCourseId !== '') {
    return Number(injectedCourseId) || 0
  }
  return editableCourseId.value
})

// inject node-view 提供的状态
const showConfig = inject('nodeViewShowConfig', ref(false))
const meta = inject('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))

// 设置组件元信息（告知 node-view 显示设置按钮）
if (meta) {
    meta.title = '测验'
    meta.icon = 'i-lucide-clipboard-check'
    meta.hasSettings = true
}

const emit = defineEmits(['init'])

const quizId = computed(() => Number(props.node?.attrs?.content) || 0)
const quiz = ref(null)
const renderRef = ref(null)

// 从 render.vue 获取 quiz 数据
watch([renderRef, () => renderRef.value?.data], () => {
    if (renderRef.value?.data) {
        quiz.value = renderRef.value.data
    }
}, { immediate: true, deep: true })

// 新建测验时拿到 cid 后通知父节点更新 content 属性
function onSaved(qz) {
    // 更新本地 quiz 数据
    if (quiz.value) {
        Object.assign(quiz.value, qz)
    } else {
        quiz.value = qz
    }
    // 新建测验：拿到新增 cid 后通知父节点更新 content 属性
    if (qz.cid && Number(qz.cid) !== quizId.value) {
        emit('init', qz.cid)
        props.updateAttributes({ content: String(qz.cid) })
    }
    // 编辑保存后关闭配置面板
    if (showConfig.value) {
        showConfig.value = false
    }
}
</script>
