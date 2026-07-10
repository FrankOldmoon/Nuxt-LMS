<template>
    <div class="comment-render w-full relative">
        <!-- 内联编辑面板（在上方显示） -->
        <div v-if="showConfig" class="vue-node-config">
            <Edit :comment-id="commentId" :comment="comment" :course-id="courseId" @saved="onSaved" />
        </div>

        <Render :node="node" :comment="comment" :course-id="courseId" />
    </div>
</template>

<script setup>
import { nodeViewProps } from '@tiptap/vue-3'
import Render from './render.vue'
import Edit from './edit.vue'

const props = defineProps(nodeViewProps)

import { inject } from 'vue'
const injectedCourseId = inject('renderCourseId', undefined)
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
    meta.title = '评论'
    meta.icon = 'i-lucide-message-circle'
    meta.hasSettings = true
}

const emit = defineEmits(['init'])

const commentId = computed(() => Number(props.node?.attrs?.content) || 0)

// 获取评论数据
const apiUrl = computed(() => {
    if (!commentId.value || !courseId.value) return ''
    return `/api/comments/show?course_id=${courseId.value}&cid=${commentId.value}`
})

const { data: comment } = cRequest.use(apiUrl, {
    transform: (raw) => {
        if (!raw) return null
        return {
            name: raw.name || '',
            content: raw.content || '',
            tags: Array.isArray(raw.tags) ? [...raw.tags] : [],
            point: Number(raw.point) || 0,
        }
    },
})

// 新建评论时拿到 cid 后通知父节点更新 content 属性
function onSaved(cm) {
    if (cm.cid && Number(cm.cid) !== commentId.value) {
        emit('init', cm.cid)
        props.updateAttributes({ content: String(cm.cid) })
    }
    // 编辑保存后关闭配置面板
    if (showConfig.value) {
        showConfig.value = false
    }
}
</script>
